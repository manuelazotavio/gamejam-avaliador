import { useEffect, useState, type FormEvent } from 'react'
import { Loader } from '../components/Loader'
import { formatCpf, isValidCpf, stripCpf } from '../lib/cpf'
import { readVoterSession } from '../lib/voterSession'
import { getConfig, getJuryResults, getResults } from '../services/db'
import type { TeamResult } from '../types'
import './ResultsPage.css'

type State = { status: 'loading' } | { status: 'jury-only' } | { status: 'ready'; results: TeamResult[] }

export function ResultsPage() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [cpfInput, setCpfInput] = useState('')
  const [checking, setChecking] = useState(false)
  const [cpfError, setCpfError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const config = await getConfig()
      if (!config.resultsPrivate) {
        setState({ status: 'ready', results: await getResults() })
        return
      }
      // Privado: o banco só devolve o placar para admins; o júri entra pelo CPF.
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
          // CPF salvo não é do júri: cai no pedido de CPF.
        }
      }
      setState({ status: 'jury-only' })
    }
    void load()
  }, [])

  async function handleJuryCpf(event: FormEvent) {
    event.preventDefault()
    if (!isValidCpf(cpfInput)) {
      setCpfError('Digite um CPF válido.')
      return
    }
    setChecking(true)
    setCpfError(null)
    try {
      setState({ status: 'ready', results: await getJuryResults(cpfInput) })
    } catch (error) {
      setCpfError((error as Error).message)
    } finally {
      setChecking(false)
    }
  }

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
        <form className="card vote-card" onSubmit={handleJuryCpf} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ fontSize: 22 }}>Os resultados estão disponíveis apenas para o júri</h2>
          <p>Se você faz parte do júri, informe seu CPF para ver o placar.</p>
          <div className="field">
            <label htmlFor="jury-cpf">CPF</label>
            <input
              id="jury-cpf"
              className="input"
              placeholder="000.000.000-00"
              value={formatCpf(cpfInput)}
              onChange={(event) => setCpfInput(stripCpf(event.target.value))}
              maxLength={14}
              inputMode="numeric"
            />
          </div>
          {cpfError && <div className="alert alert--error">{cpfError}</div>}
          <button type="submit" className="btn btn-primary btn-block" disabled={checking}>
            {checking ? 'Verificando...' : 'Ver resultados'}
          </button>
        </form>
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
