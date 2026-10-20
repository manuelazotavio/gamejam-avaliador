import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EvaluationForm } from '../../components/EvaluationForm'
import { Loader } from '../../components/Loader'
import { useToast } from '../../context/useToast'
import { formatCpf, isValidCpf, stripCpf } from '../../lib/cpf'
import { getCurrentPosition, haversineDistanceMeters } from '../../lib/geo'
import {
  forgetVoterCpf,
  isLocationFresh,
  markLocationVerified,
  markTeamEvaluated,
  readVoterSession,
  saveVoterCpf,
} from '../../lib/voterSession'
import { checkVoterEligibility, getConfig, getTeam, submitEvaluation } from '../../services/db'
import { EMPTY_EVALUATION, type EventConfig, type EvaluationInput, type Team, type VoterRole } from '../../types'
import './vote.css'

type Step = 'loading' | 'location' | 'cpf' | 'vote' | 'done'

// O CPF vem antes da localização: o júri não passa pela checagem de localização.
const STEPS: Step[] = ['cpf', 'location', 'vote', 'done']

function maskCpf(cpf: string): string {
  return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`
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

  // key: ao trocar de time, o fluxo recomeça (CPF e localização salvos são reaproveitados).
  return <VoteFlow key={team.id} team={team} />
}

function VoteFlow({ team }: { team: Team }) {
  const { notify } = useToast()

  const [step, setStep] = useState<Step>('loading')
  const [config, setConfig] = useState<EventConfig | null>(null)

  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null)

  const [cpfInput, setCpfInput] = useState(() => readVoterSession().cpf ?? '')
  const [cpfLoading, setCpfLoading] = useState(false)
  const [cpfError, setCpfError] = useState<string | null>(null)

  const [evaluation, setEvaluation] = useState<EvaluationInput>(EMPTY_EVALUATION)
  const [submitting, setSubmitting] = useState(false)
  const [role, setRole] = useState<VoterRole>('popular')

  // O júri nunca passa pela localização; o público só quando ela está ligada e vencida.
  function needsLocation(cfg: EventConfig, voterRole: VoterRole): boolean {
    return voterRole !== 'jury' && cfg.requireLocation && !isLocationFresh(readVoterSession())
  }

  // Confere o CPF neste time e segue para a localização ou as notas,
  // ou volta para a etapa do CPF com o motivo.
  async function verifyCpf(cpf: string, cfg: EventConfig): Promise<void> {
    setCpfLoading(true)
    setCpfError(null)
    try {
      const eligibility = await checkVoterEligibility(cpf, team.id)
      if (!eligibility.ok) {
        setCpfError(eligibility.reason)
        setStep('cpf')
        return
      }
      setRole(eligibility.role)
      saveVoterCpf(stripCpf(cpf))
      setStep(needsLocation(cfg, eligibility.role) ? 'location' : 'vote')
    } catch (error) {
      setCpfError((error as Error).message)
      setStep('cpf')
    } finally {
      setCpfLoading(false)
    }
  }

  useEffect(() => {
    getConfig().then((loaded) => {
      setConfig(loaded)
      const savedCpf = readVoterSession().cpf
      if (savedCpf) {
        void verifyCpf(savedCpf, loaded)
      } else {
        setStep('cpf')
      }
    })
    // Só na montagem: cada time tem seu próprio VoteFlow (key).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Com a trava por aparelho, depois do primeiro voto este celular fica com este CPF.
  const canChangeCpf = !(config?.oneVotePerDevice && readVoterSession().evaluated.length > 0)
  const steps = config?.requireLocation === false || role === 'jury' ? STEPS.filter((s) => s !== 'location') : STEPS

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
        markLocationVerified()
        setStep('vote')
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

  function handleCheckCpf() {
    if (!config) return
    if (!isValidCpf(cpfInput)) {
      setCpfError('Digite um CPF válido.')
      return
    }
    void verifyCpf(cpfInput, config)
  }

  function handleChangeCpf() {
    forgetVoterCpf()
    setCpfInput('')
    setCpfError(null)
    setRole('popular')
    setStep('cpf')
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await submitEvaluation(cpfInput, team.id, evaluation)
      markTeamEvaluated(team.id)
      setStep('done')
    } catch (error) {
      notify((error as Error).message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page container container--narrow vote-page">
      {step !== 'loading' && (
        <div className="vote-stepper">
          {steps.map((s, index) => (
            <div key={s} className={`vote-stepper__dot ${step === s ? 'is-active' : ''} ${steps.indexOf(step) > index ? 'is-done' : ''}`}>
              {index + 1}
            </div>
          ))}
        </div>
      )}

      {step === 'loading' && <Loader />}

      {step === 'location' && config && (
        <div className="card vote-card">
          <h2>Confirme sua presença no evento</h2>
          <p>
            Para avaliar <strong>{team.gameTitle || team.name}</strong>, precisamos confirmar que você está fisicamente no local da GameJam
            {` (raio de ${config.radiusMeters}m).`}
          </p>
          {locationError && <div className="alert alert--error">{locationError}</div>}
          <button className="btn btn-primary btn-block" onClick={handleCheckLocation} disabled={locationLoading}>
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
          <p>
            Você só precisa informar uma vez: depois é só avaliar os outros times.{' '}
            {config?.votersOnly !== false && 'Ele precisa estar na lista de eleitores do evento.'}
          </p>
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
          <Link to="/" className="btn btn-ghost btn-block">
            Ver outros times
          </Link>
        </div>
      )}

      {step === 'vote' && (
        <div className="card vote-card vote-card--evaluation">
          <div className="alert alert--info vote-star-tip">⭐ Clique duas vezes na estrela para dar meia estrela.</div>
          <h2>{team.gameTitle || team.name}</h2>
          {team.gameTitle && <p className="vote-card__hint">{team.name}</p>}
          {role === 'jury' && <span className="badge vote-role-badge">Avaliação do júri</span>}
          <EvaluationForm value={evaluation} onChange={setEvaluation} role={role} />
          <div className="vote-nav">
            <button className="btn btn-primary btn-block" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Enviando...' : 'Enviar avaliação'}
            </button>
          </div>
          <p className="vote-identity">
            Avaliando com o CPF {maskCpf(stripCpf(cpfInput))}
            {canChangeCpf && (
              <>
                {' · '}
                <button type="button" className="vote-identity__change" onClick={handleChangeCpf}>
                  Trocar CPF
                </button>
              </>
            )}
          </p>
        </div>
      )}

      {step === 'done' && (
        <div className="card vote-card vote-card--success">
          <h2>Avaliação registrada!</h2>
          <p>
            Obrigada por avaliar {team.gameTitle || team.name}. Para avaliar os outros times, escolha na lista ou escaneie o QR
            code: não precisa digitar o CPF de novo.
          </p>
          <Link to="/" className="btn btn-primary btn-block">
            Avaliar outro time
          </Link>
          <Link to="/resultados" className="btn btn-ghost btn-block">
            Ver resultados
          </Link>
        </div>
      )}
    </div>
  )
}
