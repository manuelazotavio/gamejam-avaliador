import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { Loader } from './Loader'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <Loader />
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
