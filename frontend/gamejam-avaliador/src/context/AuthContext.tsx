import { useMemo, useState, type ReactNode } from 'react'
import { adminLogin } from '../services/db'
import { AuthContext, type AuthContextValue } from './auth-context'

const SESSION_KEY = 'gamejam.adminSession'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => sessionStorage.getItem(SESSION_KEY) === 'true',
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      login: async (password: string) => {
        const ok = await adminLogin(password)
        if (ok) {
          sessionStorage.setItem(SESSION_KEY, 'true')
          setIsAuthenticated(true)
        }
        return ok
      },
      logout: () => {
        sessionStorage.removeItem(SESSION_KEY)
        setIsAuthenticated(false)
      },
    }),
    [isAuthenticated],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
