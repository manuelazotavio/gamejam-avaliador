import { createContext } from 'react'

export interface AuthContextValue {
  isAuthenticated: boolean
  login: (password: string) => Promise<boolean>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
