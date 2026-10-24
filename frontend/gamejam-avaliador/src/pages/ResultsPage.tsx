import { useEffect, useState } from 'react'
import { Loader } from '../components/Loader'
import { readVoterSession } from '../lib/voterSession'
import { getConfig, getJuryResults, getResults } from '../services/db'
import type { TeamResult } from '../types'
import './ResultsPage.css'

type State = { status: 'loading' } | { status: 'jury-only' } | { status: 'ready'; results: TeamResult[] }

export function ResultsPage() {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    async function load() {
      const config = await getConfig()
      if (!config.resultsPrivate) {
        setState({ status: 'ready', results: await getResults() })
        return
      }
      // Privado: o banco só devolve o placar para admins; o júri usa o CPF já salvo ao votar.
      const adminResults = await getResults()
      if (adminResults.length > 0) {
        setState({ status: 'ready', results: adminResults })
        return
      }
      const savedCpf = readVoterSession().cpf
      if (savedCpf) {
        try {
          setState({ status: 'ready', results: await getJuryResults(savedCpf) })
          return
        } catch {
          // CPF salvo não é do júri: mostra o aviso.
        }
      }
      setState({ status: 'jury-only' })
    }
    void load()
  }, [])

  if (state.status === 'loading') {
    return (
      <div className="page container container--narrow">
        <Loader label="Calculando resultados..." />
      </div>
    )
  }

  if (state.status === 'jury-only') {
    return (
      <div className="page container container--narrow">
        <span className="eyebrow">resultados</span>
        <h1 style={{ fontSize: 36, marginTop: 10, marginBottom: 24 }}>Resultados</h1>
        <div className="card vote-card">
          <h2 style={{ fontSize: 22 }}>Os resultados estão disponíveis apenas para o júri</h2>
        </div>
      </div>
    )
  }

  const { results } = state

  return (
    <div className="page container container--narrow">
      <span className="eyebrow">placar ao vivo</span>
      <h1 style={{ fontSize: 36, marginTop: 10, marginBottom: 32 }}>Resultados</h1>

      {results.every((r) => r.evaluationCount === 0) && (
        <div className="alert alert--info" style={{ marginBottom: 24 }}>
          Ainda não há avaliações registradas. O placar abaixo será atualizado assim que a votação começar.
        </div>
      )}

      <div className="results-list">
        {results.map((result) => (
          <div key={result.teamId} className="results-row">
            <span className="results-row__rank">{result.rank}º</span>
            <div className="results-row__info">
              <strong>{result.gameTitle || result.teamName}</strong>
              {result.gameTitle && <span>{result.teamName}</span>}
            </div>
            <div className="results-row__score">
              <span className="results-row__average">{result.finalScore.toFixed(1)}/100</span>
              <span className="results-row__count">
                {result.evaluationCount} {result.evaluationCount === 1 ? 'avaliação' : 'avaliações'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
