import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconArrowRight, IconMapPin, IconShield, IconStar, IconUsers } from '../components/icons'
import { listTeams } from '../services/db'
import './HomePage.css'

export function HomePage() {
  const [teamCount, setTeamCount] = useState<number | null>(null)

  useEffect(() => {
    listTeams().then((teams) => setTeamCount(teams.length))
  }, [])

  return (
    <div className="home">
      <section className="home-hero">
        <div className="container home-hero__inner">
          <span className="eyebrow">
            <IconStar style={{ width: 14, height: 14 }} /> gamejam feita por mulheres
          </span>
          <h1>
            Vote nas equipes que estão <span className="gradient-text">reprogramando o jogo</span>
          </h1>
          <p className="home-hero__lead">
            Avalie os projetos da GameJam Delas com estrelas, direto do local do evento. Votação
            segura, com verificação de presença e proteção contra votos duplicados.
          </p>
          <div className="home-hero__actions">
            <Link to="/votar" className="btn btn-primary">
              Quero votar <IconArrowRight style={{ width: 18, height: 18 }} />
            </Link>
            <Link to="/times" className="btn btn-ghost">
              Ver times {teamCount !== null ? `(${teamCount})` : ''}
            </Link>
          </div>
        </div>
      </section>

      <section className="container">
        <div className="home-features">
          <div className="card home-feature">
            <div className="home-feature__icon">
              <IconMapPin />
            </div>
            <h3>Verificação de proximidade</h3>
            <p>Só é possível votar estando fisicamente no local do evento, no IF.</p>
          </div>
          <div className="card home-feature">
            <div className="home-feature__icon">
              <IconShield />
            </div>
            <h3>Um voto por pessoa</h3>
            <p>Bloqueio por CPF e por IP do dispositivo evita votos repetidos.</p>
          </div>
          <div className="card home-feature">
            <div className="home-feature__icon">
              <IconUsers />
            </div>
            <h3>Times reais, histórias reais</h3>
            <p>Conheça as equipes formadas por mulheres desenvolvedoras de jogos.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
