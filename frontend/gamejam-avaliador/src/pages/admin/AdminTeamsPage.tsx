import { useEffect, useState, type FormEvent } from 'react'
import { Loader } from '../../components/Loader'
import { useToast } from '../../context/useToast'
import { createTeam, deleteTeam, listTeams, updateTeam, type TeamInput } from '../../services/db'
import type { Team } from '../../types'

const EMPTY_FORM: TeamInput = {
  name: '',
  gameTitle: '',
}

export function AdminTeamsPage() {
  const { notify } = useToast()
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TeamInput>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function refresh() {
    setTeams(await listTeams())
  }

  useEffect(() => {
    listTeams().then(setTeams)
  }, [])

  function startEdit(team: Team) {
    setEditingId(team.id)
    setForm({
      name: team.name,
      gameTitle: team.gameTitle,
    })
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim() || !form.gameTitle.trim()) {
      notify('Preencha ao menos o nome do time e do jogo.', 'error')
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await updateTeam(editingId, form)
        notify('Time atualizado.', 'success')
      } else {
        await createTeam(form)
        notify('Time cadastrado.', 'success')
      }
      resetForm()
      await refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(team: Team) {
    if (!confirm(`Remover o time "${team.name}"?`)) return
    await deleteTeam(team.id)
    notify('Time removido.', 'info')
    await refresh()
  }

  return (
    <div>
      <div className="admin-header">
        <div>
          <span className="eyebrow">times</span>
          <h1 style={{ fontSize: 28, marginTop: 8 }}>Gerenciar times</h1>
        </div>
      </div>

      <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 28 }}>
        <h3 style={{ marginBottom: 16 }}>{editingId ? 'Editar time' : 'Novo time'}</h3>
        <div className="admin-form-grid">
          <div className="field">
            <label>Nome do time</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Pixel Bruxas"
            />
          </div>
          <div className="field">
            <label>Nome do jogo</label>
            <input
              className="input"
              value={form.gameTitle}
              onChange={(e) => setForm((f) => ({ ...f, gameTitle: e.target.value }))}
              placeholder="Encanto de Bytes"
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar time'}
          </button>
          {editingId && (
            <button type="button" className="btn btn-ghost" onClick={resetForm}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {teams === null && <Loader />}

      {teams !== null && (
        <div className="scroll-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Jogo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id}>
                  <td>{team.name}</td>
                  <td>{team.gameTitle}</td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(team)}>
                      Editar
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(team)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
              {teams.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-faint)' }}>
                    Nenhum time cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
