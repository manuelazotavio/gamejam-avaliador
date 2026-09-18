import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { IconLock } from '../../components/icons'
import { useAuth } from '../../context/useAuth'

export function AdminLoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/admin/dashboard'
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const ok = await login(password)
    setLoading(false)
    if (!ok) {
      setError('Senha incorreta.')
      return
    }
    navigate('/admin/dashboard', { replace: true })
  }

  return (
    <div className="page container container--narrow">
      <div className="card" style={{ maxWidth: 380, margin: '40px auto 0', textAlign: 'center' }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: 'var(--gradient-main)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            color: '#fff',
          }}
        >
          <IconLock style={{ width: 24, height: 24 }} />
        </div>
        <h2 style={{ fontSize: 22, marginBottom: 6 }}>Painel administrativo</h2>
        <p style={{ marginBottom: 20 }}>Acesso restrito à organização da GameJam Delas.</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoFocus
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
