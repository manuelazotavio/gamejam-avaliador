export interface Team {
  id: string
  name: string
  gameTitle: string
  description: string
  members: string[]
  color: string
  createdAt: number
}

export interface Voter {
  cpf: string
  name: string
  imported: boolean
  hasVoted: boolean
  votedAt: number | null
  ip: string | null
}

export interface VoteEntry {
  teamId: string
  stars: number
}

export interface VoteRecord {
  id: string
  cpf: string
  ip: string
  entries: VoteEntry[]
  createdAt: number
}

export interface EventConfig {
  latitude: number
  longitude: number
  radiusMeters: number
  eventName: string
  votingOpen: boolean
}

export interface AdminSession {
  authenticated: boolean
}

export interface GeoCheckResult {
  allowed: boolean
  distanceMeters: number | null
  error: string | null
}
