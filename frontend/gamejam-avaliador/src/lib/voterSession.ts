// Lembra a eleitora neste aparelho para não pedir CPF e localização a cada time.
// Fica no localStorage porque cada QR code costuma abrir uma aba nova.
// É só conveniência: o servidor valida o CPF de novo em cada avaliação.

const KEY = 'cienciadelas.voter'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000
// A localização vale por menos tempo, para não votar de casa com uma checagem antiga.
const LOCATION_TTL_MS = 3 * 60 * 60 * 1000

export interface VoterSession {
  cpf: string | null
  savedAt: number
  locationAt: number | null
  evaluated: string[]
}

function empty(): VoterSession {
  return { cpf: null, savedAt: Date.now(), locationAt: null, evaluated: [] }
}

export function readVoterSession(): VoterSession {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    const session = JSON.parse(raw) as VoterSession
    if (Date.now() - session.savedAt > SESSION_TTL_MS) return empty()
    return { ...empty(), ...session }
  } catch {
    return empty()
  }
}

function write(session: VoterSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    // sem armazenamento: a pessoa só confirma CPF e localização de novo no próximo time.
  }
}

export function isLocationFresh(session: VoterSession): boolean {
  return session.locationAt !== null && Date.now() - session.locationAt < LOCATION_TTL_MS
}

export function saveVoterCpf(cpf: string): void {
  const session = readVoterSession()
  // Outro CPF no mesmo aparelho: a lista de times avaliados é de quem votou antes.
  write({ ...session, cpf, savedAt: Date.now(), evaluated: session.cpf === cpf ? session.evaluated : [] })
}

export function markLocationVerified(): void {
  write({ ...readVoterSession(), locationAt: Date.now() })
}

export function markTeamEvaluated(teamId: string): void {
  const session = readVoterSession()
  if (!session.evaluated.includes(teamId)) write({ ...session, evaluated: [...session.evaluated, teamId] })
}

export function forgetVoterCpf(): void {
  write({ ...readVoterSession(), cpf: null, evaluated: [] })
}

const DEVICE_KEY = 'cienciadelas.device'
let memoryDeviceId: string | null = null

// Identificador aleatório deste navegador, para a trava "um CPF por aparelho".
// Não expira com a sessão: o aparelho continua ligado ao CPF que votou nele.
export function getDeviceId(): string {
  try {
    const saved = localStorage.getItem(DEVICE_KEY)
    if (saved) return saved
    const created = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, created)
    return created
  } catch {
    // sem armazenamento: vale só enquanto a página estiver aberta.
    memoryDeviceId ??= crypto.randomUUID()
    return memoryDeviceId
  }
}
