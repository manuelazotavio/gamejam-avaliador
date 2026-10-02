import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EvaluationForm } from '../../components/EvaluationForm'
import { Loader } from '../../components/Loader'
import { useToast } from '../../context/useToast'
import { formatCpf, isValidCpf, stripCpf } from '../../lib/cpf'
import { getCurrentPosition, haversineDistanceMeters } from '../../lib/geo'
import { checkVoterEligibility, getConfig, getTeam, submitEvaluation } from '../../services/db'
import { EMPTY_EVALUATION, type EventConfig, type EvaluationInput, type Team } from '../../types'
import './vote.css'

type Step = 'location' | 'cpf' | 'vote' | 'done'

const STEPS: Step[] = ['location', 'cpf', 'vote', 'done']
const CPF_KEY = 'gamejam.cpf'

function readSavedCpf(): string {
  try {
    return sessionStorage.getItem(CPF_KEY) ?? ''
  } catch {
    return ''
  }
}

function saveCpf(cpf: string): void {
  try {
    sessionStorage.setItem(CPF_KEY, cpf)
  } catch {
    // sem armazenamento: a pessoa só digita o CPF de novo no próximo time.
  }
}

export function VotePage() {
  const [searchParams] = useSearchParams()
  const teamId = searchParams.get('time')
  const [loaded, setLoaded] = useState<{ teamId: string; team: Team | null } | null>(null)

  useEffect(() => {
    if (!teamId) return
    let active = true
    getTeam(teamId)
      .then((team) => active && setLoaded({ teamId, team }))
      .catch(() => active && setLoaded({ teamId, team: null }))
    return () => {
      active = false
    }
  }, [teamId])

  // undefined = carregando; null = sem time (link sem ?time= ou time inexistente).
  const team = !teamId ? null : loaded?.teamId === teamId ? loaded.team : undefined

  if (team === undefined) {
    return (
      <div className="page container container--narrow vote-page">
        <Loader />
      </div>
    )
  }

  if (team === null) {
    return (
      <div className="page container container--narrow vote-page">
        <div className="card vote-card">
          <h2>Escolha um time para avaliar</h2>
          <p>Não encontramos o time deste link. Escaneie o QR code do time ou escolha na lista.</p>
          <Link to="/" className="btn btn-primary btn-block">
            Ver times
          </Link>
        </div>
      </div>
    )
  }

  // key: ao trocar de time, o fluxo (localização, CPF, notas) recomeça do zero.
  return <VoteFlow key={team.id} team={team} />
}

function VoteFlow({ team }: { team: Team }) {
  const { notify } = useToast()

  const [step, setStep] = useState<Step>('location')
  const [config, setConfig] = useState<EventConfig | null>(null)

  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null)

  const [cpfInput, setCpfInput] = useState(readSavedCpf)
  const [cpfLoading, setCpfLoading] = useState(false)
  const [cpfError, setCpfError] = useState<string | null>(null)

  const [evaluation, setEvaluation] = useState<EvaluationInput>(EMPTY_EVALUATION)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getConfig().then(setConfig)
  }, [])

  async function handleCheckLocation() {
    if (!config) return
    setLocationLoading(true)
    setLocationError(null)
    try {
      const position = await getCurrentPosition()
      const distance = haversineDistanceMeters(
        { latitude: position.coords.latitude, longitude: position.coords.longitude },
        { latitude: config.latitude, longitude: config.longitude },
      )
      setDistanceMeters(distance)
      if (distance <= config.radiusMeters) {
        setStep('cpf')
      } else {
        setLocationError(
          `Você está a ${Math.round(distance)}m do local do evento. É preciso estar a até ${config.radiusMeters}m para votar.`,
        )
      }
    } catch (error) {
      setLocationError(
        error instanceof GeolocationPositionError
          ? 'Não conseguimos acessar sua localização. Permita o acesso e tente novamente.'
          : (error as Error).message,
      )
    } finally {
      setLocationLoading(false)
    }
  }

  async function handleCheckCpf() {
    if (!isValidCpf(cpfInput)) {
      setCpfError('Digite um CPF válido.')
      return
    }
    setCpfLoading(true)
    setCpfError(null)
    try {
      const eligibility = await checkVoterEligibility(cpfInput, team.id)
      if (!eligibility.ok) {
        setCpfError(eligibility.reason)
        return
      }
      saveCpf(stripCpf(cpfInput))
      setStep('vote')
    } catch (error) {
      setCpfError((error as Error).message)
    } finally {
      setCpfLoading(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await submitEvaluation(cpfInput, team.id, evaluation)
      setStep('done')
    } catch (error) {
      notify((error as Error).message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page container container--narrow vote-page">
      <div className="vote-stepper">
        {STEPS.map((s, index) => (
          <div key={s} className={`vote-stepper__dot ${step === s ? 'is-active' : ''} ${STEPS.indexOf(step) > index ? 'is-done' : ''}`}>
            {index + 1}
          </div>
        ))}
      </div>

      {step === 'location' && (
        <div className="card vote-card">
          <h2>Confirme sua presença no evento</h2>
          <p>
            Para avaliar <strong>{team.gameTitle}</strong>, precisamos confirmar que você está fisicamente no local da GameJam
            {config ? ` (raio de ${config.radiusMeters}m).` : '.'}
          </p>
          {locationError && <div className="alert alert--error">{locationError}</div>}
          <button className="btn btn-primary btn-block" onClick={handleCheckLocation} disabled={locationLoading || !config}>
            {locationLoading ? 'Verificando localização...' : 'Verificar minha localização'}
          </button>
          {distanceMeters !== null && (
            <span className="vote-card__hint">Distância detectada: {Math.round(distanceMeters)}m</span>
          )}
        </div>
      )}

      {step === 'cpf' && (
        <div className="card vote-card">
          <h2>Identifique-se com seu CPF</h2>
          <p>Usamos seu CPF apenas para garantir uma avaliação por time. Ele precisa estar na lista de eleitores do evento.</p>
          <div className="field">
            <label htmlFor="cpf">CPF</label>
            <input
              id="cpf"
              className="input"
              placeholder="000.000.000-00"
              value={formatCpf(cpfInput)}
              onChange={(event) => setCpfInput(stripCpf(event.target.value))}
              maxLength={14}
              inputMode="numeric"
            />
          </div>
          {cpfError && <div className="alert alert--error">{cpfError}</div>}
          <button className="btn btn-primary btn-block" onClick={handleCheckCpf} disabled={cpfLoading}>
            {cpfLoading ? 'Validando...' : 'Continuar'}
          </button>
        </div>
      )}

      {step === 'vote' && (
        <div className="card vote-card vote-card--evaluation">
          <h2>{team.gameTitle}</h2>
          <p className="vote-card__hint">{team.name}</p>
          <EvaluationForm value={evaluation} onChange={setEvaluation} />
          <div className="vote-nav">
            <button className="btn btn-primary btn-block" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Enviando...' : 'Enviar avaliação'}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="card vote-card vote-card--success">
          <h2>Avaliação registrada!</h2>
          <p>Obrigada por avaliar {team.gameTitle}. Você pode avaliar os outros times escaneando o QR code de cada um.</p>
          <Link to="/resultados" className="btn btn-primary btn-block">
            Ver resultados
          </Link>
          <Link to="/" className="btn btn-ghost btn-block">
            Ver outros times
          </Link>
        </div>
      )}
    </div>
  )
}
