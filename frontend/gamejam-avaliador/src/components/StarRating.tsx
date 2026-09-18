import { useState } from 'react'
import { IconStar } from './icons'
import './StarRating.css'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  readOnly?: boolean
  size?: number
}

export function StarRating({ value, onChange, readOnly = false, size = 28 }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const active = hovered ?? value

  return (
    <div
      className={`star-rating ${readOnly ? 'star-rating--readonly' : ''}`}
      role={readOnly ? undefined : 'radiogroup'}
      aria-label="Avaliação em estrelas"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          className={`star-rating__star ${star <= active ? 'is-active' : ''}`}
          style={{ width: size, height: size }}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(null)}
          aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
          aria-pressed={star <= value}
        >
          <IconStar />
        </button>
      ))}
    </div>
  )
}
