import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EvaluationForm } from '../../components/EvaluationForm'
import { Loader } from '../../components/Loader'
import { useToast } from '../../context/useToast'
import { formatCpf, isValidCpf, stripCpf } from '../../lib/cpf'
import { getClientIp } from '../../lib/clientIp'
import { getCurrentPosition, haversineDistanceMeters } from '../../lib/geo'
import { checkVoterEligibility, getConfig, listTeams, submitVote } from '../../services/db'
import { EMPTY_EVALUATION, type EventConfig, type EvaluationInput, type Team } from '../../types'
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
  const [teamIndex, setTeamIndex] = useState(0)
  const [evaluations, setEvaluations] = useState<Record<string, EvaluationInput>>({})
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
      if (teamList.length === 0) {
        setCpfError('Nenhum time cadastrado para avaliação ainda.')
        return
      }
      setTeams(teamList)
      setTeamIndex(0)
      setStep('vote')
    } finally {
      setCpfLoading(false)
    }
  }

  function updateCurrentEvaluation(teamId: string, value: EvaluationInput) {
    setEvaluations((prev) => ({ ...prev, [teamId]: value }))
  }

  async function handleSubmitVotes(finalEvaluations: Record<string, EvaluationInput>) {
    if (!teams || !ip) return
    setSubmitting(true)
    try {
      await submitVote(
        cpfInput,
        ip,
        teams.map((team) => ({ teamId: team.id, scores: finalEvaluations[team.id] ?? EMPTY_EVALUATION })),
      )
      setStep('done')
    } catch (error) {
      notify((error as Error).message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function handleNext() {
    if (!teams) return
    if (teamIndex < teams.length - 1) {
      setTeamIndex((index) => index + 1)
    } else {
      handleSubmitVotes(evaluations)
    }
  }

  function handleBack() {
    setTeamIndex((index) => Math.max(0, index - 1))
  }

  const currentTeam = teams?.[teamIndex] ?? null
  const currentValue = currentTeam ? (evaluations[currentTeam.id] ?? EMPTY_EVALUATION) : EMPTY_EVALUATION

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
          </button>
        </div>
      )}

      {step === 'vote' && currentTeam && teams && (
        <div className="card vote-card vote-card--evaluation">
          <span className="vote-progress">
            Time {teamIndex + 1} de {teams.length}
          </span>
          <h2>{currentTeam.gameTitle}</h2>
          <p className="vote-card__hint">{currentTeam.name}</p>
          <EvaluationForm value={currentValue} onChange={(value) => updateCurrentEvaluation(currentTeam.id, value)} />
          <div className="vote-nav">
            <button className="btn btn-ghost" onClick={handleBack} disabled={teamIndex === 0 || submitting}>
              Voltar
            </button>
            <button className="btn btn-primary" onClick={handleNext} disabled={submitting}>
              {submitting ? 'Enviando...' : teamIndex < teams.length - 1 ? 'Próximo time' : 'Enviar avaliações'}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="card vote-card vote-card--success">
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
