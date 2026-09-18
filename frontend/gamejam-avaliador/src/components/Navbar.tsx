import { NavLink } from 'react-router-dom'
import { IconController } from './icons'
import './Navbar.css'

const links = [
  { to: '/', label: 'Início', end: true },
  { to: '/times', label: 'Times' },
  { to: '/votar', label: 'Votar' },
  { to: '/resultados', label: 'Resultados' },
]

export function Navbar() {
  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <NavLink to="/" className="navbar__brand">
          <span className="navbar__brand-icon">
            <IconController />
          </span>
          <span>
            GameJam <strong>Delas</strong>
          </span>
        </NavLink>

        <nav className="navbar__links">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `navbar__link ${isActive ? 'is-active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <NavLink to="/admin" className="btn btn-ghost btn-sm navbar__admin">
          Painel admin
        </NavLink>
      </div>
    </header>
  )
}
