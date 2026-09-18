import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconArrowRight, IconCheck, IconLock, IconMapPin } from '../../components/icons'
import { Loader } from '../../components/Loader'
import { StarRating } from '../../components/StarRating'
import { useToast } from '../../context/useToast'
import { formatCpf, isValidCpf, stripCpf } from '../../lib/cpf'
import { getClientIp } from '../../lib/clientIp'
import { getCurrentPosition, haversineDistanceMeters } from '../../lib/geo'
import { checkVoterEligibility, getConfig, listTeams, submitVote } from '../../services/db'
import type { EventConfig, Team } from '../../types'
import './vote.css'

type Step = 'location' | 'cpf' | 'vote' | 'done'

export function VotePage() {
  const { notify } = useToast()
  const [step, setStep] = useState<Step>('location')
  const [config, setConfig] = useState<EventConfig | null>(null)

  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null)

  const [cpfInput, setCpfInput] = useState('')
  const [cpfLoading, setCpfLoading] = useState(false)
  const [cpfError, setCpfError] = useState<string | null>(null)

  const [ip, setIp] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getConfig().then(setConfig)
    getClientIp().then(setIp)
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
      const currentIp = ip ?? (await getClientIp())
      setIp(currentIp)
      const eligibility = await checkVoterEligibility(cpfInput, currentIp)
      if (!eligibility.ok) {
        setCpfError(eligibility.reason)
        return
      }
      const teamList = await listTeams()
      setTeams(teamList)
      setStep('vote')
    } finally {
      setCpfLoading(false)
    }
  }

  async function handleSubmitVotes() {
    if (!teams || !ip) return
    const missing = teams.some((team) => !ratings[team.id])
    if (missing) {
      notify('Avalie todos os times antes de enviar.', 'error')
      return
    }
    setSubmitting(true)
    try {
      await submitVote(
        cpfInput,
        ip,
        teams.map((team) => ({ teamId: team.id, stars: ratings[team.id] })),
      )
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
        {(['location', 'cpf', 'vote', 'done'] as Step[]).map((s, index) => (
          <div key={s} className={`vote-stepper__dot ${step === s ? 'is-active' : ''} ${stepIndex(step) > index ? 'is-done' : ''}`}>
            {index + 1}
          </div>
        ))}
      </div>

      {step === 'location' && (
        <div className="card vote-card">
          <div className="vote-card__icon">
            <IconMapPin />
          </div>
          <h2>Confirme sua presença no evento</h2>
          <p>
            Para votar, precisamos confirmar que você está fisicamente no local da GameJam
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
          <div className="vote-card__icon">
            <IconLock />
          </div>
          <h2>Identifique-se com seu CPF</h2>
          <p>Usamos seu CPF apenas para garantir um voto por pessoa. Ele precisa estar na lista de eleitores do evento.</p>
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
            {!cpfLoading && <IconArrowRight style={{ width: 18, height: 18 }} />}
          </button>
        </div>
      )}

      {step === 'vote' && teams && (
        <div className="vote-teams">
          <h2 style={{ marginBottom: 6 }}>Avalie cada time</h2>
          <p style={{ marginBottom: 24 }}>Dê de 1 a 5 estrelas para cada jogo apresentado.</p>
          <div className="vote-teams__list">
            {teams.map((team) => (
              <div key={team.id} className="card vote-team-row">
                <div className="vote-team-row__info">
                  <strong>{team.gameTitle}</strong>
                  <span>{team.name}</span>
                </div>
                <StarRating
                  value={ratings[team.id] ?? 0}
                  onChange={(value) => setRatings((prev) => ({ ...prev, [team.id]: value }))}
                />
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-block" onClick={handleSubmitVotes} disabled={submitting} style={{ marginTop: 24 }}>
            {submitting ? 'Enviando votos...' : 'Enviar votos'}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="card vote-card vote-card--success">
          <div className="vote-card__icon vote-card__icon--success">
            <IconCheck />
          </div>
          <h2>Voto registrado!</h2>
          <p>Obrigada por avaliar os times da GameJam Delas. Confira o placar em tempo real.</p>
          <Link to="/resultados" className="btn btn-primary btn-block">
            Ver resultados
          </Link>
        </div>
      )}

      {step === 'vote' && teams === null && <Loader />}
    </div>
  )
}

function stepIndex(step: Step): number {
  return ['location', 'cpf', 'vote', 'done'].indexOf(step)
}
