import { useEffect, useState } from 'react'
import { Loader } from '../components/Loader'
import { TeamCard } from '../components/TeamCard'
import { listTeams } from '../services/db'
import type { Team } from '../types'

export function TeamsPage() {
  const [teams, setTeams] = useState<Team[] | null>(null)

  useEffect(() => {
    listTeams().then(setTeams)
  }, [])

  return (
    <div className="page container">
      <span className="eyebrow">times inscritas</span>
      <h1 style={{ fontSize: 40, marginTop: 10, marginBottom: 10 }}>Conheça as equipes</h1>
      <p style={{ maxWidth: 560, marginBottom: 36 }}>
        Cada time é formado por desenvolvedoras que criaram um jogo do zero durante a jam. Explore
        os projetos antes de votar.
      </p>

      {teams === null && <Loader label="Carregando times..." />}

      {teams !== null && teams.length === 0 && (
        <div className="empty-state">Nenhum time cadastrado ainda.</div>
      )}

      {teams !== null && teams.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 20,
          }}
        >
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  )
}
