import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import './Navbar.css'

const links = [
  { to: '/', label: 'Times', end: true },
  { to: '/votar', label: 'Votar' },
  { to: '/resultados', label: 'Resultados' },
]

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <NavLink to="/" className="navbar__brand">
          <span>
            GameJam <strong>Delas</strong>
          </span>
        </NavLink>

        <button
          type="button"
          className={`navbar__toggle ${menuOpen ? 'is-open' : ''}`}
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`navbar__menu ${menuOpen ? 'is-open' : ''}`}>
          <nav className="navbar__links">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={closeMenu}
                className={({ isActive }) => `navbar__link ${isActive ? 'is-active' : ''}`}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <NavLink to="/admin" className="btn btn-ghost btn-sm navbar__admin" onClick={closeMenu}>
            Painel admin
          </NavLink>
        </div>
      </div>
    </header>
  )
}
