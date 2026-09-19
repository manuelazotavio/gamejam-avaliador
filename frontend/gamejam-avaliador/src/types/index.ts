export interface Team {
  id: string
  name: string
  gameTitle: string
}

export interface Voter {
  cpf: string
  name: string
  imported: boolean
  hasVoted: boolean
  votedAt: number | null
  ip: string | null
}

export interface EvaluationInput {
  creativityInnovation: number
  technicalQuality: number
  themeAdequacy: number
  inclusionDiversityAccessibility: number
  gameplayFun: number
  artSoundOriginality: number
}

export interface CriterionMeta {
  key: keyof EvaluationInput
  label: string
  max: number
}

export const CRITERIA: CriterionMeta[] = [
  { key: 'creativityInnovation', label: 'Criatividade e inovação', max: 15 },
  { key: 'technicalQuality', label: 'Qualidade técnica', max: 15 },
  { key: 'themeAdequacy', label: 'Adequação ao tema e ao desafio', max: 20 },
  { key: 'inclusionDiversityAccessibility', label: 'Inclusão, diversidade e acessibilidade', max: 20 },
  { key: 'gameplayFun', label: 'Jogabilidade e diversão', max: 15 },
  { key: 'artSoundOriginality', label: 'Originalidade na arte, som e design', max: 15 },
]

export const EMPTY_EVALUATION: EvaluationInput = {
  creativityInnovation: 0,
  technicalQuality: 0,
  themeAdequacy: 0,
  inclusionDiversityAccessibility: 0,
  gameplayFun: 0,
  artSoundOriginality: 0,
}

export interface CriterionScore {
  criterion: string
  label: string
  maxScore: number
  average: number
}

export interface TeamResult {
  rank: number
  teamId: string
  teamName: string
  gameTitle: string
  finalScore: number
  evaluationCount: number
  criterionScores: CriterionScore[]
}

export interface VoteRecord {
  id: string
  cpf: string
  ip: string
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
