import { CRITERIA, STAR_MAX, type EvaluationInput, type VoterRole } from '../types'
import { StarRating } from './StarRating'
import './EvaluationForm.css'

interface EvaluationFormProps {
  value: EvaluationInput
  onChange: (value: EvaluationInput) => void
  // jury: mostra os pontos com os pesos; popular: só estrelas e a média, sem peso.
  role?: VoterRole
  readOnly?: boolean
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

export function EvaluationForm({ value, onChange, role = 'popular', readOnly = false }: EvaluationFormProps) {
  const isJury = role === 'jury'
  // Estrelas viram pontos pelo peso do critério, como no placar do júri.
  const pointsFor = (key: keyof EvaluationInput, max: number) => (value[key] / STAR_MAX) * max
  const juryTotal = CRITERIA.reduce((sum, criterion) => sum + pointsFor(criterion.key, criterion.max), 0)
  const starAverage = CRITERIA.reduce((sum, criterion) => sum + value[criterion.key], 0) / CRITERIA.length

  return (
    <div className="evaluation-form">
      {CRITERIA.map((criterion) => (
        <div key={criterion.key} className="evaluation-form__row">
          <div className="evaluation-form__label">
            <span>{criterion.label}</span>
            <strong>
              {isJury
                ? `${formatNumber(pointsFor(criterion.key, criterion.max))}/${criterion.max}`
                : `${formatNumber(value[criterion.key])} ★`}
            </strong>
          </div>
          <StarRating
            label={criterion.label}
            value={value[criterion.key]}
            readOnly={readOnly}
            onChange={(stars) => onChange({ ...value, [criterion.key]: stars })}
          />
        </div>
      ))}
      <div className="evaluation-form__total">
        <span>{isJury ? 'Total' : 'Média'}</span>
        <strong>{isJury ? `${formatNumber(juryTotal)}/100` : `${formatNumber(starAverage)} de ${STAR_MAX} ★`}</strong>
      </div>
    </div>
  )
}
