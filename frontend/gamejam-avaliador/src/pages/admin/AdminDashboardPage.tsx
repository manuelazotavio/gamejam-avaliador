import { useEffect, useState } from 'react'
import { Loader } from '../../components/Loader'
import { StarRating } from '../../components/StarRating'
import { getResults, listTeams, listVoters, listVotes, type TeamResult } from '../../services/db'
import type { Team, VoteRecord, Voter } from '../../types'

interface Stats {
  teams: Team[]
  voters: Voter[]
  votes: VoteRecord[]
  results: TeamResult[]
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    Promise.all([listTeams(), listVoters(), listVotes(), getResults()]).then(
      ([teams, voters, votes, results]) => setStats({ teams, voters, votes, results }),
    )
  }, [])

  if (!stats) return <Loader label="Carregando painel..." />

  const turnout = stats.voters.length
    ? Math.round((stats.voters.filter((v) => v.hasVoted).length / stats.voters.length) * 100)
    : 0

  return (
    <div>
      <div className="admin-header">
        <div>
          <span className="eyebrow">visão geral</span>
          <h1 style={{ fontSize: 30, marginTop: 8 }}>Painel da GameJam Delas</h1>
        </div>
      </div>

      <div className="admin-stat-grid">
        <div className="card admin-stat-card">
          <div className="admin-stat-card__value">{stats.teams.length}</div>
          <div className="admin-stat-card__label">Times cadastrados</div>
        </div>
        <div className="card admin-stat-card">
          <div className="admin-stat-card__value">{stats.voters.length}</div>
          <div className="admin-stat-card__label">Eleitoras importadas</div>
        </div>
        <div className="card admin-stat-card">
          <div className="admin-stat-card__value">{stats.votes.length}</div>
          <div className="admin-stat-card__label">Votos registrados</div>
        </div>
        <div className="card admin-stat-card">
          <div className="admin-stat-card__value">{turnout}%</div>
          <div className="admin-stat-card__label">Participação</div>
        </div>
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 14 }}>Placar atual</h2>
      <div className="scroll-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Jogo</th>
              <th>Média</th>
              <th>Votos</th>
            </tr>
          </thead>
          <tbody>
            {stats.results.map((result) => (
              <tr key={result.team.id}>
                <td>{result.team.name}</td>
                <td>{result.team.gameTitle}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StarRating value={Math.round(result.average)} readOnly size={16} />
                    {result.average.toFixed(1)}
                  </div>
                </td>
                <td>{result.votesCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
