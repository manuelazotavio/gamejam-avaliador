import { createContext } from 'react'

export interface AuthContextValue {
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
