import { CRITERIA, type EvaluationInput } from '../types'
import './EvaluationForm.css'

interface EvaluationFormProps {
  value: EvaluationInput
  onChange: (value: EvaluationInput) => void
  readOnly?: boolean
}

export function EvaluationForm({ value, onChange, readOnly = false }: EvaluationFormProps) {
  const total = CRITERIA.reduce((sum, criterion) => sum + value[criterion.key], 0)

  return (
    <div className="evaluation-form">
      {CRITERIA.map((criterion) => (
        <div key={criterion.key} className="evaluation-form__row">
          <div className="evaluation-form__label">
            <span>{criterion.label}</span>
            <strong>
              {value[criterion.key]}/{criterion.max}
            </strong>
          </div>
          <input
            type="range"
            min={0}
            max={criterion.max}
            value={value[criterion.key]}
            disabled={readOnly}
            onChange={(event) => onChange({ ...value, [criterion.key]: Number(event.target.value) })}
          />
        </div>
      ))}
      <div className="evaluation-form__total">
        <span>Total</span>
        <strong>{total}/100</strong>
      </div>
    </div>
  )
}
