import { useEffect, useState } from 'react'
import { IconTrophy } from '../components/icons'
import { Loader } from '../components/Loader'
import { StarRating } from '../components/StarRating'
import { getResults, type TeamResult } from '../services/db'
import './ResultsPage.css'

export function ResultsPage() {
  const [results, setResults] = useState<TeamResult[] | null>(null)

  useEffect(() => {
    getResults().then(setResults)
  }, [])

  return (
    <div className="page container container--narrow">
      <span className="eyebrow">
        <IconTrophy style={{ width: 14, height: 14 }} /> placar ao vivo
      </span>
      <h1 style={{ fontSize: 36, marginTop: 10, marginBottom: 10 }}>Resultados</h1>
      <p style={{ marginBottom: 32 }}>Média de estrelas recebida por cada time, atualizada em tempo real.</p>

      {results === null && <Loader label="Calculando resultados..." />}

      {results !== null && results.every((r) => r.votesCount === 0) && (
        <div className="alert alert--info" style={{ marginBottom: 24 }}>
          Ainda não há votos registrados. O placar abaixo será atualizado assim que a votação começar.
        </div>
      )}

      {results !== null && (
        <div className="results-list">
          {results.map((result, index) => (
            <div key={result.team.id} className="results-row card">
              <span className="results-row__rank">{index + 1}º</span>
              <div className="results-row__info">
                <strong>{result.team.gameTitle}</strong>
                <span>{result.team.name}</span>
              </div>
              <div className="results-row__score">
                <StarRating value={Math.round(result.average)} readOnly size={18} />
                <span className="results-row__average">{result.average.toFixed(1)}</span>
                <span className="results-row__count">
                  {result.votesCount} {result.votesCount === 1 ? 'voto' : 'votos'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
