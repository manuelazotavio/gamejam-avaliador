import { isValidCpf, stripCpf } from '../lib/cpf'
import { readJson, writeJson } from '../lib/storage'
import { apiCreateTeam, apiDeleteTeam, apiGetResults, apiListTeams, apiSubmitEvaluation, apiUpdateTeam, type TeamInput } from './api'
import type { EventConfig, EvaluationInput, Team, TeamResult, VoteRecord, Voter } from '../types'

export type { TeamInput } from './api'

const KEYS = {
  voters: 'gamejam.voters',
  votes: 'gamejam.votes',
  config: 'gamejam.config',
  seeded: 'gamejam.seeded',
}

const ADMIN_PASSCODE = 'gamejam2025'

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

export function listTeams(): Promise<Team[]> {
  return apiListTeams()
}

export function createTeam(input: TeamInput): Promise<Team> {
  return apiCreateTeam(input)
}

export function updateTeam(id: string, input: TeamInput): Promise<Team> {
  return apiUpdateTeam(id, input)
}

export function deleteTeam(id: string): Promise<void> {
  return apiDeleteTeam(id)
}

export function getResults(): Promise<TeamResult[]> {
  return apiGetResults()
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

export interface TeamEvaluation {
  teamId: string
  scores: EvaluationInput
}

export async function submitVote(cpfRaw: string, ip: string, evaluations: TeamEvaluation[]): Promise<VoteRecord> {
  const cpf = stripCpf(cpfRaw)
  const eligibility = await checkVoterEligibility(cpf, ip)
  if (!eligibility.ok) {
    throw new Error(eligibility.reason ?? 'Não foi possível registrar o voto.')
  }

  for (const evaluation of evaluations) {
    await apiSubmitEvaluation(evaluation.teamId, evaluation.scores)
  }

  const voters = readJson<Voter[]>(KEYS.voters, [])
  const votes = readJson<VoteRecord[]>(KEYS.votes, [])

  const record: VoteRecord = {
    id: uid('vote'),
    cpf,
    ip,
    createdAt: Date.now(),
  }

  const nextVoters = voters.map((voter) =>
    voter.cpf === cpf ? { ...voter, hasVoted: true, votedAt: record.createdAt, ip } : voter,
  )

  writeJson(KEYS.voters, nextVoters)
  writeJson(KEYS.votes, [...votes, record])

  return record
}

export async function listVotes(): Promise<VoteRecord[]> {
  return delay(readJson<VoteRecord[]>(KEYS.votes, []))
}

export async function adminLogin(password: string): Promise<boolean> {
  return delay(password === ADMIN_PASSCODE)
}
