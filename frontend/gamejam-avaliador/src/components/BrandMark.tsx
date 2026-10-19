import './BrandMark.css'

const DELAS = ['D', 'E', 'L', 'A', 'S']

export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`brand-mark brand-mark--${size}`} aria-label="Ciência Delas">
      <span className="brand-mark__top" aria-hidden="true">
        CIÊNCIA
      </span>
      <span className="brand-mark__bottom" aria-hidden="true">
        {DELAS.map((letter, i) => (
          <span key={letter} className={`brand-mark__tile brand-mark__tile--${i}`}>
            {letter}
          </span>
        ))}
      </span>
    </span>
  )
}
