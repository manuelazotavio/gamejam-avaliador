import { FunctionsHttpError, type PostgrestError } from '@supabase/supabase-js'
import { isValidCpf, stripCpf } from '../lib/cpf'
import { supabase } from '../lib/supabase'
import { getDeviceId } from '../lib/voterSession'
import { CRITERIA, type EventConfig, type EvaluationInput, type Team, type TeamResult, type Voter, type VoterRole } from '../types'

const GENERIC_ERROR = 'Não foi possível falar com o servidor.'

function unwrap<T>({ data, error }: { data: T; error: PostgrestError | null }): NonNullable<T> {
  if (error) {
    console.error(error)
    throw new Error(GENERIC_ERROR)
  }
  return data as NonNullable<T>
}

async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body })
  if (error) {
    const payload =
      error instanceof FunctionsHttpError
        ? ((await error.context.json().catch(() => null)) as { error?: string } | null)
        : null
    throw new Error(payload?.error ?? GENERIC_ERROR)
  }
  return data as T
}

function toTimestamp(value: string | null): number | null {
  return value ? new Date(value).getTime() : null
}

/** creativityInnovation -> creativity_innovation */
function toColumn(key: keyof EvaluationInput): string {
  return key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`)
}

// ---------------------------------------------------------------------------
// Times
// ---------------------------------------------------------------------------

export interface TeamInput {
  name: string
  gameTitle: string
}

interface TeamRow {
  id: string
  name: string
  game_title: string | null
}

function toTeam(row: TeamRow): Team {
  return { id: row.id, name: row.name, gameTitle: row.game_title ?? '' }
}

export async function listTeams(): Promise<Team[]> {
  const rows = unwrap(await supabase.from('teams').select('id, name, game_title').order('created_at'))
  return rows.map(toTeam)
}

export async function getTeam(id: string): Promise<Team | null> {
  const { data, error } = await supabase.from('teams').select('id, name, game_title').eq('id', id).maybeSingle()
  if (error) {
    console.error(error)
    throw new Error(GENERIC_ERROR)
  }
  return data ? toTeam(data) : null
}

export async function createTeam(input: TeamInput): Promise<Team> {
  const row = unwrap(
    await supabase
      .from('teams')
      .insert({ name: input.name.trim(), game_title: input.gameTitle.trim() || null })
      .select('id, name, game_title')
      .single(),
  )
  return toTeam(row)
}

export async function updateTeam(id: string, input: TeamInput): Promise<Team> {
  const row = unwrap(
    await supabase
      .from('teams')
      .update({ name: input.name.trim(), game_title: input.gameTitle.trim() || null })
      .eq('id', id)
      .select('id, name, game_title')
      .single(),
  )
  return toTeam(row)
}

export async function deleteTeam(id: string): Promise<void> {
  unwrap(await supabase.from('teams').delete().eq('id', id))
}

// ---------------------------------------------------------------------------
// Placar
// ---------------------------------------------------------------------------

type TeamResultRow = {
  rank: number
  team_id: string
  team_name: string
  game_title: string | null
  final_score: number
  evaluation_count: number
  jury_count: number
  popular_count: number
} & Record<string, number | string>

export async function getResults(): Promise<TeamResult[]> {
  const rows = unwrap(await supabase.from('team_results').select('*').order('rank')) as TeamResultRow[]
  return rows.map((row) => ({
    rank: row.rank,
    teamId: row.team_id,
    teamName: row.team_name,
    gameTitle: row.game_title ?? '',
    finalScore: row.final_score,
    evaluationCount: row.evaluation_count,
    juryCount: row.jury_count,
    popularCount: row.popular_count,
    criterionScores: CRITERIA.map((criterion) => ({
      criterion: criterion.key,
      label: criterion.label,
      maxScore: criterion.max,
      average: Number(row[toColumn(criterion.key)]),
    })),
  }))
}

// ---------------------------------------------------------------------------
// Eleitoras e votos (admin)
// ---------------------------------------------------------------------------

interface VoterStatusRow {
  cpf: string
  name: string
  imported: boolean
  role: VoterRole
  evaluation_count: number
  first_voted_at: string | null
  ip: string | null
}

export async function listVoters(role?: VoterRole): Promise<Voter[]> {
  let query = supabase.from('voter_status').select('*').order('name')
  if (role) query = query.eq('role', role)
  const rows = unwrap(await query) as VoterStatusRow[]
  return rows.map((row) => ({
    cpf: row.cpf,
    name: row.name,
    imported: row.imported,
    role: row.role,
    hasVoted: row.evaluation_count > 0,
    evaluationCount: row.evaluation_count,
    votedAt: toTimestamp(row.first_voted_at),
    ip: row.ip,
  }))
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

export async function importVoters(rows: VoterImportRow[], role: VoterRole = 'popular'): Promise<ImportSummary> {
  const summary: ImportSummary = { added: 0, duplicated: 0, invalid: 0 }
  const unique = new Map<string, { cpf: string; name: string; role: VoterRole }>()

  for (const row of rows) {
    const cpf = stripCpf(row.cpf)
    if (!isValidCpf(cpf)) {
      summary.invalid += 1
    } else if (unique.has(cpf)) {
      summary.duplicated += 1
    } else {
      unique.set(cpf, { cpf, name: row.name.trim() || 'Sem nome informado', role })
    }
  }

  if (unique.size > 0) {
    // Júri: um CPF que já estava na lista do público passa para o júri (atualiza nome e papel).
    // Público: ignoreDuplicates não rebaixa ninguém do júri; CPFs já cadastrados não voltam no select.
    const inserted = unwrap(
      await supabase
        .from('voters')
        .upsert([...unique.values()], { onConflict: 'cpf', ignoreDuplicates: role === 'popular' })
        .select('cpf'),
    )
    summary.added = inserted.length
    summary.duplicated += unique.size - inserted.length
  }

  return summary
}

export async function removeVoter(cpf: string): Promise<void> {
  unwrap(await supabase.from('voters').delete().eq('cpf', stripCpf(cpf)))
}

// ---------------------------------------------------------------------------
// Configuração do evento
// ---------------------------------------------------------------------------

interface EventConfigRow {
  event_name: string
  latitude: number
  longitude: number
  radius_meters: number
  voting_open: boolean
  one_vote_per_ip: boolean
  require_location: boolean
  voters_only: boolean
  one_vote_per_device: boolean
}

function toConfig(row: EventConfigRow): EventConfig {
  return {
    eventName: row.event_name,
    latitude: row.latitude,
    longitude: row.longitude,
    radiusMeters: row.radius_meters,
    votingOpen: row.voting_open,
    oneVotePerIp: row.one_vote_per_ip,
    requireLocation: row.require_location,
    votersOnly: row.voters_only,
    oneVotePerDevice: row.one_vote_per_device,
  }
}

const CONFIG_COLUMNS = 'event_name, latitude, longitude, radius_meters, voting_open, one_vote_per_ip, require_location, voters_only, one_vote_per_device'

export async function getConfig(): Promise<EventConfig> {
  return toConfig(unwrap(await supabase.from('event_config').select(CONFIG_COLUMNS).eq('id', 1).single()))
}

export async function updateConfig(config: EventConfig): Promise<EventConfig> {
  const row = unwrap(
    await supabase
      .from('event_config')
      .update({
        event_name: config.eventName,
        latitude: config.latitude,
        longitude: config.longitude,
        radius_meters: config.radiusMeters,
        voting_open: config.votingOpen,
        one_vote_per_ip: config.oneVotePerIp,
        require_location: config.requireLocation,
        voters_only: config.votersOnly,
        one_vote_per_device: config.oneVotePerDevice,
      })
      .eq('id', 1)
      .select(CONFIG_COLUMNS)
      .single(),
  )
  return toConfig(row)
}

// ---------------------------------------------------------------------------
// Votação (Edge Functions)
// ---------------------------------------------------------------------------

export interface EligibilityResult {
  ok: boolean
  reason: string | null
  role: VoterRole
}

export function checkVoterEligibility(cpf: string, teamId: string): Promise<EligibilityResult> {
  return invokeFunction<EligibilityResult>('check-voter', { cpf: stripCpf(cpf), teamId, deviceId: getDeviceId() })
}

export async function submitEvaluation(cpf: string, teamId: string, scores: EvaluationInput): Promise<void> {
  await invokeFunction('submit-vote', { cpf: stripCpf(cpf), teamId, scores, deviceId: getDeviceId() })
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin')
  return !error && data === true
}
