import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

export function AdminLoginPage() {
  const { isAuthenticated, loading: authLoading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (authLoading) return null

  if (isAuthenticated) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/admin/dashboard'
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const ok = await login(email.trim(), password)
    setLoading(false)
    if (!ok) {
      setError('E-mail ou senha incorretos.')
      return
    }
    navigate('/admin/dashboard', { replace: true })
  }

  return (
    <div className="page container container--narrow">
      <div className="card" style={{ maxWidth: 380, margin: '40px auto 0', textAlign: 'center' }}>
        <h2 style={{ fontSize: 22, marginBottom: 6 }}>Painel administrativo</h2>
        <p style={{ marginBottom: 20 }}>Acesso restrito à organização da GameJam Delas.</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          {error && <div className="alert alert--error">{error}</div>}
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
