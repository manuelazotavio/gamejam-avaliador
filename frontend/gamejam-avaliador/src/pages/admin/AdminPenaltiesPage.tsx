import { useEffect, useState, type FormEvent } from 'react'
import { Loader } from '../../components/Loader'
import { useToast } from '../../context/useToast'
import { addPenalty, listPenalties, listTeams, removePenalty } from '../../services/db'
import {
  PENALTY_KINDS,
  POINTS_PER_ABSENT_MEMBER,
  RULE_VIOLATION_MAX,
  RULE_VIOLATION_MIN,
  type Penalty,
  type PenaltyKind,
  type Team,
} from '../../types'

interface FormState {
  teamId: string
  kind: PenaltyKind
  members: number
  points: number
  note: string
}

const EMPTY_FORM: FormState = { teamId: '', kind: 'opening_absence', members: 1, points: RULE_VIOLATION_MIN, note: '' }

function kindLabel(kind: PenaltyKind): string {
  return PENALTY_KINDS.find((k) => k.kind === kind)?.label ?? kind
}

function teamLabel(team: Team | undefined): string {
  if (!team) return 'Time removido'
  return team.gameTitle ? `${team.name} · ${team.gameTitle}` : team.name
}

export function AdminPenaltiesPage() {
  const { notify } = useToast()
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [penalties, setPenalties] = useState<Penalty[] | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function refresh() {
    setPenalties(await listPenalties())
  }

  useEffect(() => {
    listTeams().then(setTeams)
    listPenalties().then(setPenalties)
  }, [])

  const isAbsence = form.kind !== 'rule_violation'
  const points = isAbsence ? form.members * POINTS_PER_ABSENT_MEMBER : form.points

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.teamId) {
      notify('Escolha o time.', 'error')
      return
    }
    if (isAbsence ? form.members < 1 : form.points < RULE_VIOLATION_MIN || form.points > RULE_VIOLATION_MAX) {
      notify(
        isAbsence
          ? 'Informe ao menos 1 integrante ausente.'
          : `O descumprimento do regulamento vai de ${RULE_VIOLATION_MIN} a ${RULE_VIOLATION_MAX} pontos.`,
        'error',
      )
      return
    }
    setSaving(true)
    try {
      await addPenalty({
        teamId: form.teamId,
        kind: form.kind,
        members: isAbsence ? form.members : null,
        points,
        note: form.note,
      })
      notify(`Penalidade de -${points} pontos aplicada.`, 'success')
      setForm({ ...EMPTY_FORM, teamId: form.teamId })
      await refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(penalty: Penalty) {
    if (!confirm(`Remover a penalidade de -${penalty.points} pontos?`)) return
    await removePenalty(penalty.id)
    notify('Penalidade removida.', 'info')
    await refresh()
  }

  if (!teams || !penalties) return <Loader />

  const teamsById = new Map(teams.map((team) => [team.id, team]))
  const totals = new Map<string, number>()
  for (const penalty of penalties) totals.set(penalty.teamId, (totals.get(penalty.teamId) ?? 0) + penalty.points)

  return (
    <div>
      <div className="admin-header">
        <div>
          <span className="eyebrow">penalidades</span>
          <h1 style={{ fontSize: 28, marginTop: 8 }}>Penalidades</h1>
          <p style={{ marginTop: 6 }}>Os pontos são descontados da pontuação final da equipe (item 12 do edital).</p>
        </div>
      </div>

      <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 28, maxWidth: 640 }}>
        <h3 style={{ marginBottom: 16 }}>Aplicar penalidade</h3>
        <div className="field" style={{ marginBottom: 16 }}>
          <label>Time</label>
          <select className="input" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
            <option value="">Escolha o time</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {teamLabel(team)}
              </option>
            ))}
          </select>
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label>Tipo</label>
          <select
            className="input"
            value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value as PenaltyKind })}
          >
            {PENALTY_KINDS.map(({ kind, label }) => (
              <option key={kind} value={kind}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-form-grid" style={{ marginBottom: 16 }}>
          {isAbsence ? (
            <div className="field">
              <label>Integrantes ausentes</label>
              <input
                className="input"
                type="number"
                min={1}
                value={form.members}
                onChange={(e) => setForm({ ...form, members: Math.max(0, Math.round(Number(e.target.value))) })}
              />
              <small style={{ color: 'var(--text-faint)' }}>-{POINTS_PER_ABSENT_MEMBER} pontos por integrante</small>
            </div>
          ) : (
            <div className="field">
              <label>Pontos a descontar</label>
              <input
                className="input"
                type="number"
                min={RULE_VIOLATION_MIN}
                max={RULE_VIOLATION_MAX}
                value={form.points}
                onChange={(e) => setForm({ ...form, points: Math.round(Number(e.target.value)) })}
              />
              <small style={{ color: 'var(--text-faint)' }}>
                De {RULE_VIOLATION_MIN} a {RULE_VIOLATION_MAX}, conforme a gravidade
              </small>
            </div>
          )}
          <div className="field">
            <label>Desconto</label>
            <div className="penalty-preview">-{points} pontos</div>
          </div>
        </div>

        <div className="field" style={{ marginBottom: 18 }}>
          <label>Observação (opcional)</label>
          <input
            className="input"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Ex.: Ana e Bia não compareceram"
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Aplicando...' : 'Aplicar penalidade'}
        </button>
      </form>

      <div className="scroll-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Penalidade</th>
              <th>Pontos</th>
              <th>Observação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {penalties.map((penalty) => (
              <tr key={penalty.id}>
                <td>
                  {teamLabel(teamsById.get(penalty.teamId))}
                  <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                    Total do time: -{totals.get(penalty.teamId)} pontos
                  </div>
                </td>
                <td>
                  {kindLabel(penalty.kind)}
                  {penalty.members !== null && (
                    <div style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                      {penalty.members} {penalty.members === 1 ? 'integrante' : 'integrantes'}
                    </div>
                  )}
                </td>
                <td>
                  <span className="badge badge--bad">-{penalty.points}</span>
                </td>
                <td>{penalty.note || '—'}</td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => handleRemove(penalty)}>
                    Remover
                  </button>
                </td>
              </tr>
            ))}
            {penalties.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-faint)' }}>
                  Nenhuma penalidade aplicada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
