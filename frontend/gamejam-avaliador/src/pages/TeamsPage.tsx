import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { Loader } from '../components/Loader'
import { TeamCard } from '../components/TeamCard'
import { listTeams } from '../services/db'
import type { Team } from '../types'
import './TeamsPage.css'

export function TeamsPage() {
  const [teams, setTeams] = useState<Team[] | null>(null)

  useEffect(() => {
    listTeams().then(setTeams)
  }, [])

  return (
    <>
      <section className="teams-hero">
        <div className="container teams-hero__inner">
          <BrandMark size="lg" />
          <h1 className="teams-hero__title">
            <small>Avaliação</small>
            GAME JAM 2026
          </h1>
          <p className="teams-hero__meta">23ª Semana Nacional de Ciência e Tecnologia · IFSP Campus Caraguatatuba</p>
        </div>
      </section>

      <div className="page container">
        <h2 className="teams-heading">
          Escolha um time para <span>votar</span>
        </h2>

        {teams === null && <Loader label="Carregando times..." />}

        {teams !== null && teams.length === 0 && (
          <div className="empty-state">Nenhum time cadastrado ainda.</div>
        )}

        {teams !== null && teams.length > 0 && (
          <div className="teams-grid">
            {teams.map((team) => (
              <Link key={team.id} to={`/votar?time=${team.id}`} className="teams-grid__link">
                <TeamCard team={team} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
