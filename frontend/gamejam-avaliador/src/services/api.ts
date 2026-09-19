import type { EvaluationInput, Team, TeamResult } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

interface ProblemDetail {
  detail?: string
  fields?: Record<string, string>
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as ProblemDetail | null
    const fieldMessage = problem?.fields ? Object.values(problem.fields)[0] : null
    throw new Error(fieldMessage ?? problem?.detail ?? 'Não foi possível falar com o servidor.')
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export interface TeamInput {
  name: string
  gameTitle: string
}

export function apiListTeams(): Promise<Team[]> {
  return request<Team[]>('/api/teams')
}

export function apiCreateTeam(input: TeamInput): Promise<Team> {
  return request<Team>('/api/teams', { method: 'POST', body: JSON.stringify(input) })
}

export function apiUpdateTeam(id: string, input: TeamInput): Promise<Team> {
  return request<Team>(`/api/teams/${id}`, { method: 'PUT', body: JSON.stringify(input) })
}

export function apiDeleteTeam(id: string): Promise<void> {
  return request<void>(`/api/teams/${id}`, { method: 'DELETE' })
}

export function apiSubmitEvaluation(teamId: string, input: EvaluationInput): Promise<void> {
  return request<void>(`/api/teams/${teamId}/evaluations`, { method: 'POST', body: JSON.stringify(input) })
}

export function apiGetResults(): Promise<TeamResult[]> {
  return request<TeamResult[]>('/api/results')
}
