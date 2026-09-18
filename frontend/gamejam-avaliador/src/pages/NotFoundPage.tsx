import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="page container container--narrow" style={{ textAlign: 'center' }}>
      <span className="eyebrow">erro 404</span>
      <h1 style={{ fontSize: 40, margin: '14px 0' }}>Página não encontrada</h1>
      <p style={{ marginBottom: 24 }}>Esse caminho não existe na GameJam Delas.</p>
      <Link to="/" className="btn btn-primary">
        Voltar ao início
      </Link>
    </div>
  )
}
