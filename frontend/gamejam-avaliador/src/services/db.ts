import { isValidCpf, stripCpf } from '../lib/cpf'
import { readJson, writeJson } from '../lib/storage'
import type { EventConfig, Team, VoteEntry, VoteRecord, Voter } from '../types'

const KEYS = {
  teams: 'gamejam.teams',
  voters: 'gamejam.voters',
  votes: 'gamejam.votes',
  config: 'gamejam.config',
  seeded: 'gamejam.seeded',
}

const ADMIN_PASSCODE = 'gamejam2025'

const DEFAULT_TEAMS: Team[] = [
  {
    id: 'team-pixel-bruxas',
    name: 'Pixel Bruxas',
    gameTitle: 'Encanto de Bytes',
    description:
      'Um platformer mágico onde três bruxas programadoras precisam quebrar bugs amaldiçoados para salvar o reino do código.',
    members: ['Aline Souza', 'Beatriz Nunes', 'Carla Menezes'],
    color: '#ff4fd8',
    createdAt: Date.now(),
  },
  {
    id: 'team-byte-me',
    name: 'Byte Me',
    gameTitle: 'Overclock',
    description:
      'Corrida frenética em realidade aumentada por dentro de uma placa-mãe que está superaquecendo.',
    members: ['Débora Lima', 'Elisa Prado'],
    color: '#7c4dff',
    createdAt: Date.now(),
  },
  {
    id: 'team-garotas-glitch',
    name: 'Garotas Glitch',
    gameTitle: 'Falha Fatal',
    description:
      'Puzzle narrativo sobre uma hacker que precisa consertar a própria realidade antes que ela se desfaça em glitches.',
    members: ['Fernanda Reis', 'Giovana Castro', 'Helena Torres', 'Isabela Farias'],
    color: '#00e5c7',
    createdAt: Date.now(),
  },
  {
    id: 'team-rainha-do-loop',
    name: 'Rainha do Loop',
    gameTitle: 'Ciclo Infinito',
    description:
      'Roguelike sobre repetir o mesmo dia até encontrar a sequência certa de decisões para libertar o reino.',
    members: ['Juliana Alves', 'Karina Dutra'],
    color: '#ffb703',
    createdAt: Date.now(),
  },
]

const DEFAULT_CONFIG: EventConfig = {
  eventName: 'GameJam Delas',
  latitude: -23.5505,
  longitude: -46.6333,
  radiusMeters: 300,
  votingOpen: true,
}

function seedIfNeeded(): void {
  const seeded = readJson<boolean>(KEYS.seeded, false)
  if (seeded) return
  writeJson(KEYS.teams, DEFAULT_TEAMS)
  writeJson(KEYS.voters, [] as Voter[])
  writeJson(KEYS.votes, [] as VoteRecord[])
  writeJson(KEYS.config, DEFAULT_CONFIG)
  writeJson(KEYS.seeded, true)
}

seedIfNeeded()

function delay<T>(value: T, ms = 220): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

export async function listTeams(): Promise<Team[]> {
  const teams = readJson<Team[]>(KEYS.teams, [])
  return delay([...teams].sort((a, b) => a.createdAt - b.createdAt))
}

export async function getTeam(id: string): Promise<Team | null> {
  const teams = readJson<Team[]>(KEYS.teams, [])
  return delay(teams.find((team) => team.id === id) ?? null)
}

export interface TeamInput {
  name: string
  gameTitle: string
  description: string
  members: string[]
  color: string
}

export async function createTeam(input: TeamInput): Promise<Team> {
  const teams = readJson<Team[]>(KEYS.teams, [])
  const team: Team = { id: uid('team'), createdAt: Date.now(), ...input }
  writeJson(KEYS.teams, [...teams, team])
  return delay(team)
}

export async function updateTeam(id: string, input: TeamInput): Promise<Team | null> {
  const teams = readJson<Team[]>(KEYS.teams, [])
  let updated: Team | null = null
  const next = teams.map((team) => {
    if (team.id !== id) return team
    updated = { ...team, ...input }
    return updated
  })
  writeJson(KEYS.teams, next)
  return delay(updated)
}

export async function deleteTeam(id: string): Promise<void> {
  const teams = readJson<Team[]>(KEYS.teams, [])
  writeJson(
    KEYS.teams,
    teams.filter((team) => team.id !== id),
  )
  return delay(undefined)
}

export async function listVoters(): Promise<Voter[]> {
  const voters = readJson<Voter[]>(KEYS.voters, [])
  return delay([...voters].sort((a, b) => a.name.localeCompare(b.name)))
}

export interface VoterImportRow {
  cpf: string
  name: string
}

export interface ImportSummary {
  added: number
  duplicated: number
  invalid: number
}

export async function importVoters(rows: VoterImportRow[]): Promise<ImportSummary> {
  const voters = readJson<Voter[]>(KEYS.voters, [])
  const existingCpfs = new Set(voters.map((voter) => voter.cpf))
  const summary: ImportSummary = { added: 0, duplicated: 0, invalid: 0 }
  const additions: Voter[] = []

  for (const row of rows) {
    const cpf = stripCpf(row.cpf)
    if (!isValidCpf(cpf)) {
      summary.invalid += 1
      continue
    }
    if (existingCpfs.has(cpf)) {
      summary.duplicated += 1
      continue
    }
    existingCpfs.add(cpf)
    additions.push({
      cpf,
      name: row.name.trim() || 'Sem nome informado',
      imported: true,
      hasVoted: false,
      votedAt: null,
      ip: null,
    })
    summary.added += 1
  }

  writeJson(KEYS.voters, [...voters, ...additions])
  return delay(summary)
}

export async function removeVoter(cpf: string): Promise<void> {
  const voters = readJson<Voter[]>(KEYS.voters, [])
  writeJson(
    KEYS.voters,
    voters.filter((voter) => voter.cpf !== stripCpf(cpf)),
  )
  return delay(undefined)
}

export async function getConfig(): Promise<EventConfig> {
  return delay(readJson<EventConfig>(KEYS.config, DEFAULT_CONFIG))
}

export async function updateConfig(patch: Partial<EventConfig>): Promise<EventConfig> {
  const current = readJson<EventConfig>(KEYS.config, DEFAULT_CONFIG)
  const next = { ...current, ...patch }
  writeJson(KEYS.config, next)
  return delay(next)
}

export interface EligibilityResult {
  ok: boolean
  reason: string | null
  voter: Voter | null
}

export async function checkVoterEligibility(cpfRaw: string, ip: string): Promise<EligibilityResult> {
  const cpf = stripCpf(cpfRaw)
  const config = readJson<EventConfig>(KEYS.config, DEFAULT_CONFIG)
  const voters = readJson<Voter[]>(KEYS.voters, [])

  if (!config.votingOpen) {
    return delay({ ok: false, reason: 'A votação está encerrada no momento.', voter: null })
  }
  if (!isValidCpf(cpf)) {
    return delay({ ok: false, reason: 'CPF inválido.', voter: null })
  }

  const voter = voters.find((entry) => entry.cpf === cpf) ?? null
  if (!voter) {
    return delay({
      ok: false,
      reason: 'Este CPF não está na lista de eleitores autorizados do evento.',
      voter: null,
    })
  }
  if (voter.hasVoted) {
    return delay({ ok: false, reason: 'Este CPF já registrou um voto.', voter })
  }
  const ipAlreadyVoted = voters.some((entry) => entry.hasVoted && entry.ip === ip)
  if (ipAlreadyVoted) {
    return delay({
      ok: false,
      reason: 'Já existe um voto registrado a partir deste dispositivo/rede.',
      voter,
    })
  }

  return delay({ ok: true, reason: null, voter })
}

export async function submitVote(cpfRaw: string, ip: string, entries: VoteEntry[]): Promise<VoteRecord> {
  const cpf = stripCpf(cpfRaw)
  const eligibility = await checkVoterEligibility(cpf, ip)
  if (!eligibility.ok) {
    throw new Error(eligibility.reason ?? 'Não foi possível registrar o voto.')
  }

  const voters = readJson<Voter[]>(KEYS.voters, [])
  const votes = readJson<VoteRecord[]>(KEYS.votes, [])

  const record: VoteRecord = {
    id: uid('vote'),
    cpf,
    ip,
    entries,
    createdAt: Date.now(),
  }

  const nextVoters = voters.map((voter) =>
    voter.cpf === cpf ? { ...voter, hasVoted: true, votedAt: record.createdAt, ip } : voter,
  )

  writeJson(KEYS.voters, nextVoters)
  writeJson(KEYS.votes, [...votes, record])

  return delay(record)
}

export async function listVotes(): Promise<VoteRecord[]> {
  return delay(readJson<VoteRecord[]>(KEYS.votes, []))
}

export interface TeamResult {
  team: Team
  average: number
  votesCount: number
}

export async function getResults(): Promise<TeamResult[]> {
  const teams = readJson<Team[]>(KEYS.teams, [])
  const votes = readJson<VoteRecord[]>(KEYS.votes, [])

  const results: TeamResult[] = teams.map((team) => {
    const stars = votes
      .flatMap((vote) => vote.entries)
      .filter((entry) => entry.teamId === team.id)
      .map((entry) => entry.stars)

    const average = stars.length ? stars.reduce((sum, value) => sum + value, 0) / stars.length : 0

    return { team, average, votesCount: stars.length }
  })

  return delay(results.sort((a, b) => b.average - a.average))
}

export async function adminLogin(password: string): Promise<boolean> {
  return delay(password === ADMIN_PASSCODE)
}
