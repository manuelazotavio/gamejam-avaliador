export interface Team {
  id: string
  name: string
  gameTitle: string
}

// jury: avalia com os pesos dos critérios; popular: entra na média do público.
export type VoterRole = 'popular' | 'jury'

export interface Voter {
  cpf: string
  name: string
  imported: boolean
  role: VoterRole
  hasVoted: boolean
  evaluationCount: number
  votedAt: number | null
  ip: string | null
}

// Notas em estrelas: 0 a STAR_MAX, com meia estrela.
export const STAR_MAX = 5

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
  // Peso do critério em pontos (a nota final soma 100).
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
  // Nota depois das penalidades; baseScore é a nota das avaliações, antes do desconto.
  finalScore: number
  baseScore: number
  penaltyPoints: number
  evaluationCount: number
  // Nota final: o público entra como mais um jurado em cada critério (regra de 2025).
  juryCount: number
  popularCount: number
  // Pontos por critério, com o público como mais um jurado.
  criterionScores: CriterionScore[]
}

export interface EventConfig {
  latitude: number
  longitude: number
  radiusMeters: number
  eventName: string
  votingOpen: boolean
  oneVotePerIp: boolean
  requireLocation: boolean
  votersOnly: boolean
  oneVotePerDevice: boolean
}

export interface GeoCheckResult {
  allowed: boolean
  distanceMeters: number | null
  error: string | null
}

// Item 12 do edital: ausências tiram 2 pontos por integrante; o regulamento, de 5 a 50.
export type PenaltyKind = 'opening_absence' | 'mentoring_absence' | 'showcase_absence' | 'rule_violation'

export const PENALTY_KINDS: { kind: PenaltyKind; label: string }[] = [
  { kind: 'opening_absence', label: 'Ausência na Abertura do Game Jam' },
  { kind: 'mentoring_absence', label: 'Ausência nas Mentorias do Game Jam' },
  { kind: 'showcase_absence', label: 'Ausência na Mostra Interativa de Jogos Digitais' },
  { kind: 'rule_violation', label: 'Descumprimento do regulamento' },
]

export const POINTS_PER_ABSENT_MEMBER = 2
export const RULE_VIOLATION_MIN = 5
export const RULE_VIOLATION_MAX = 50

export interface Penalty {
  id: string
  teamId: string
  kind: PenaltyKind
  members: number | null
  points: number
  note: string | null
  createdAt: number
}
