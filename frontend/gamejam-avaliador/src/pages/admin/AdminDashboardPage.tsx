import { useEffect, useState } from 'react'
import { Loader } from '../../components/Loader'
import { getResults, listVoters, listVotes } from '../../services/db'
import { apiListTeams } from '../../services/api'
import type { Team, TeamResult, VoteRecord, Voter } from '../../types'

interface Stats {
  teams: Team[]
  voters: Voter[]
  votes: VoteRecord[]
  results: TeamResult[]
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    Promise.all([apiListTeams(), listVoters(), listVotes(), getResults()]).then(
      ([teams, voters, votes, results]) => setStats({ teams, voters, votes, results }),
    )
  }, [])

  if (!stats) return <Loader label="Carregando painel..." />

  const turnout = stats.voters.length
    ? Math.round((stats.voters.filter((v) => v.hasVoted).length / stats.voters.length) * 100)
    : 0
  const criteriaLabels = stats.results[0]?.criterionScores.map((c) => c.label) ?? []

  return (
    <div>
      <div className="admin-header">
        <div>
          <span className="eyebrow">visão geral</span>
          <h1 style={{ fontSize: 30, marginTop: 8 }}>Painel da GameJam Delas</h1>
        </div>
      </div>

      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-card__value">{stats.teams.length}</div>
          <div className="admin-stat-card__label">Times cadastrados</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__value">{stats.voters.length}</div>
          <div className="admin-stat-card__label">Eleitoras importadas</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__value">{stats.votes.length}</div>
          <div className="admin-stat-card__label">Votos registrados</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__value">{turnout}%</div>
          <div className="admin-stat-card__label">Participação</div>
        </div>
      </div>

      <h2 style={{ fontSize: 18, marginBottom: 14 }}>Placar atual</h2>
      <div className="scroll-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Time</th>
              <th>Jogo</th>
              <th>Nota final</th>
              {criteriaLabels.map((label) => (
                <th key={label}>{label}</th>
              ))}
              <th>Avaliações</th>
            </tr>
          </thead>
          <tbody>
            {stats.results.map((result) => (
              <tr key={result.teamId}>
                <td>{result.rank}º</td>
                <td>{result.teamName}</td>
                <td>{result.gameTitle}</td>
                <td>{result.finalScore.toFixed(1)}/100</td>
                {result.criterionScores.map((score) => (
                  <td key={score.criterion}>
                    {score.average.toFixed(1)}/{score.maxScore}
                  </td>
                ))}
                <td>{result.evaluationCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
