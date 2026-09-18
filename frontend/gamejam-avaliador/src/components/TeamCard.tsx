import type { CSSProperties, ReactNode } from 'react'
import type { Team } from '../types'
import { IconUsers } from './icons'
import './TeamCard.css'

interface TeamCardProps {
  team: Team
  rank?: number
  trailing?: ReactNode
}

export function TeamCard({ team, rank, trailing }: TeamCardProps) {
  return (
    <article className="team-card" style={{ '--team-color': team.color } as CSSProperties}>
      {rank !== undefined && <span className="team-card__rank">#{rank}</span>}
      <div className="team-card__header">
        <span className="team-card__badge">{team.name}</span>
        <h3>{team.gameTitle}</h3>
      </div>
      <p className="team-card__description">{team.description}</p>
      <div className="team-card__members">
        <IconUsers />
        <span>{team.members.join(', ')}</span>
      </div>
      {trailing && <div className="team-card__trailing">{trailing}</div>}
    </article>
  )
}
