import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { isCurrentUserAdmin } from '../services/db'
import { AuthContext, type AuthContextValue } from './auth-context'

type Status = 'loading' | 'admin' | 'anonymous'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      const admin = data.session ? await isCurrentUserAdmin() : false
      if (active) setStatus(admin ? 'admin' : 'anonymous')
    })

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setStatus('anonymous')
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: status === 'admin',
      loading: status === 'loading',
      login: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return false
        if (!(await isCurrentUserAdmin())) {
          await supabase.auth.signOut()
          return false
        }
        setStatus('admin')
        return true
      },
      logout: async () => {
        await supabase.auth.signOut()
        setStatus('anonymous')
      },
    }),
    [status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
