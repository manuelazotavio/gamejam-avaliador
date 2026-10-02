import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
    <div className="page container">
      <h1 style={{ fontSize: 40, marginBottom: 36 }}>Escolha um time para votar</h1>

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
  )
}
