import { CRITERIA, STAR_MAX, type EvaluationInput } from '../types'
import { StarRating } from './StarRating'
import './EvaluationForm.css'

interface EvaluationFormProps {
  value: EvaluationInput
  onChange: (value: EvaluationInput) => void
  readOnly?: boolean
}

function formatPoints(points: number): string {
  return points.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

export function EvaluationForm({ value, onChange, readOnly = false }: EvaluationFormProps) {
  // Estrelas viram pontos pelo peso do critério, como no placar.
  const pointsFor = (key: keyof EvaluationInput, max: number) => (value[key] / STAR_MAX) * max
  const total = CRITERIA.reduce((sum, criterion) => sum + pointsFor(criterion.key, criterion.max), 0)

  return (
    <div className="evaluation-form">
      {CRITERIA.map((criterion) => (
        <div key={criterion.key} className="evaluation-form__row">
          <div className="evaluation-form__label">
            <span>{criterion.label}</span>
            <strong>
              {formatPoints(pointsFor(criterion.key, criterion.max))}/{criterion.max}
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
        <span>Total</span>
        <strong>{formatPoints(total)}/100</strong>
      </div>
    </div>
  )
}
