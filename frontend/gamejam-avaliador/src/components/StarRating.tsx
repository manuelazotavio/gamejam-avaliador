import type { KeyboardEvent } from 'react'
import { STAR_MAX } from '../types'
import './StarRating.css'

interface StarRatingProps {
  value: number
  onChange: (value: number) => void
  label: string
  readOnly?: boolean
}

const STAR_PATH =
  'M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96L12 2.5z'

function clamp(value: number): number {
  return Math.min(STAR_MAX, Math.max(0, value))
}

export function StarRating({ value, onChange, label, readOnly = false }: StarRatingProps) {
  function select(next: number) {
    if (readOnly) return
    // Clicar de novo na mesma nota zera o critério.
    onChange(next === value ? 0 : next)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (readOnly) return
    const steps: Record<string, number> = {
      ArrowRight: value + 0.5,
      ArrowUp: value + 0.5,
      ArrowLeft: value - 0.5,
      ArrowDown: value - 0.5,
      Home: 0,
      End: STAR_MAX,
    }
    if (event.key in steps) {
      event.preventDefault()
      onChange(clamp(steps[event.key]))
    }
  }

  return (
    <div
      className={`star-rating ${readOnly ? 'is-readonly' : ''}`}
      role="slider"
      tabIndex={readOnly ? -1 : 0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={STAR_MAX}
      aria-valuenow={value}
      aria-valuetext={`${value.toLocaleString('pt-BR')} de ${STAR_MAX} estrelas`}
      aria-readonly={readOnly}
      onKeyDown={handleKeyDown}
    >
      {Array.from({ length: STAR_MAX }, (_, index) => {
        const fill = Math.min(1, Math.max(0, value - index))
        return (
          <span key={index} className="star-rating__star">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={STAR_PATH} className="star-rating__empty" />
            </svg>
            <span className="star-rating__fill" style={{ width: `${fill * 100}%` }}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={STAR_PATH} />
              </svg>
            </span>
            {!readOnly && (
              <>
                <button
                  type="button"
                  tabIndex={-1}
                  className="star-rating__hit star-rating__hit--left"
                  aria-hidden="true"
                  onClick={() => select(index + 0.5)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="star-rating__hit star-rating__hit--right"
                  aria-hidden="true"
                  onClick={() => select(index + 1)}
                />
              </>
            )}
          </span>
        )
      })}
    </div>
  )
}
