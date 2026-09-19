import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import './admin.css'

const links = [
  { to: '/admin/dashboard', label: 'Visão geral' },
  { to: '/admin/times', label: 'Times' },
  { to: '/admin/eleitoras', label: 'Eleitoras' },
  { to: '/admin/configuracoes', label: 'Configurações' },
]

export function AdminLayout() {
  const { logout } = useAuth()

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__title">Painel admin</div>
        <nav className="admin-sidebar__nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `admin-sidebar__link ${isActive ? 'is-active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button className="btn btn-ghost btn-sm admin-sidebar__logout" onClick={logout}>
          Sair
        </button>
      </aside>
      <div className="admin-content container">
        <Outlet />
      </div>
    </div>
  )
}
