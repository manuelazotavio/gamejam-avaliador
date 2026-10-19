import { BrandMark } from './BrandMark'
import './Footer.css'

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <BrandMark size="sm" />
          <p>Game Jam 2026 · 23ª SNCT · IFSP Caraguatatuba</p>
        </div>
        <p className="footer__credit">
          feito por <strong>Manuela Otavio</strong>
        </p>
      </div>
    </footer>
  )
}
