import { useEffect, useState } from 'react'
import { Loader } from '../components/Loader'
import { getResults } from '../services/db'
import type { TeamResult } from '../types'
import './ResultsPage.css'

export function ResultsPage() {
  const [results, setResults] = useState<TeamResult[] | null>(null)

  useEffect(() => {
    getResults().then(setResults)
  }, [])

  return (
    <div className="page container container--narrow">
      <span className="eyebrow">placar ao vivo</span>
      <h1 style={{ fontSize: 36, marginTop: 10, marginBottom: 10 }}>Resultados</h1>
      <p style={{ marginBottom: 32 }}>Pontuação final de cada time, de 0 a 100, atualizada em tempo real.</p>

      {results === null && <Loader label="Calculando resultados..." />}

      {results !== null && results.every((r) => r.evaluationCount === 0) && (
        <div className="alert alert--info" style={{ marginBottom: 24 }}>
          Ainda não há avaliações registradas. O placar abaixo será atualizado assim que a votação começar.
        </div>
      )}

      {results !== null && (
        <div className="results-list">
          {results.map((result) => (
            <div key={result.teamId} className="results-row">
              <span className="results-row__rank">{result.rank}º</span>
              <div className="results-row__info">
                <strong>{result.gameTitle}</strong>
                <span>{result.teamName}</span>
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
      )}
    </div>
  )
}
