import { useEffect, useState, type FormEvent } from 'react'
import { Loader } from '../../components/Loader'
import { useToast } from '../../context/useToast'
import { getCurrentPosition } from '../../lib/geo'
import { getConfig, updateConfig } from '../../services/db'
import type { EventConfig } from '../../types'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  hint?: string
}

function Toggle({ checked, onChange, label, hint }: ToggleProps) {
  return (
    <label className="toggle">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden="true" />
      <span className="toggle__text">
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  )
}

export function AdminConfigPage() {
  const { notify } = useToast()
  const [config, setConfig] = useState<EventConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    getConfig().then(setConfig)
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!config) return
    setSaving(true)
    try {
      const updated = await updateConfig(config)
      setConfig(updated)
      notify('Configurações salvas.', 'success')
    } finally {
      setSaving(false)
    }
  }

  async function handleUseCurrentLocation() {
    setLocating(true)
    try {
      const position = await getCurrentPosition()
      setConfig((prev) =>
        prev
          ? { ...prev, latitude: position.coords.latitude, longitude: position.coords.longitude }
          : prev,
      )
      notify('Localização atual capturada.', 'success')
    } catch {
      notify('Não foi possível obter sua localização.', 'error')
    } finally {
      setLocating(false)
    }
  }

  if (!config) return <Loader />

  return (
    <div>
      <div className="admin-header">
        <div>
          <span className="eyebrow">configurações</span>
          <h1 style={{ fontSize: 28, marginTop: 8 }}>Evento e votação</h1>
        </div>
      </div>

      <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
        <div className="field" style={{ marginBottom: 16 }}>
          <label>Nome do evento</label>
          <input
            className="input"
            value={config.eventName}
            onChange={(e) => setConfig({ ...config, eventName: e.target.value })}
          />
        </div>

        <div className="admin-form-grid" style={{ marginBottom: 16 }}>
          <div className="field">
            <label>Latitude</label>
            <input
              className="input"
              type="number"
              step="0.000001"
              value={config.latitude}
              onChange={(e) => setConfig({ ...config, latitude: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label>Longitude</label>
            <input
              className="input"
              type="number"
              step="0.000001"
              value={config.longitude}
              onChange={(e) => setConfig({ ...config, longitude: Number(e.target.value) })}
            />
          </div>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handleUseCurrentLocation}
          disabled={locating}
          style={{ marginBottom: 16 }}
        >
          {locating ? 'Localizando...' : 'Usar minha localização atual (no IF)'}
        </button>

        <div className="field" style={{ marginBottom: 16 }}>
          <label>Raio permitido (metros)</label>
          <input
            className="input"
            type="number"
            min={10}
            value={config.radiusMeters}
            onChange={(e) => setConfig({ ...config, radiusMeters: Number(e.target.value) })}
          />
        </div>

        <div className="toggle-list">
          <Toggle
            checked={config.votingOpen}
            onChange={(votingOpen) => setConfig({ ...config, votingOpen })}
            label="Votação aberta"
          />
          <Toggle
            checked={config.requireLocation}
            onChange={(requireLocation) => setConfig({ ...config, requireLocation })}
            label="Exigir verificação de localização"
            hint="Desligado, qualquer pessoa vota sem precisar estar no raio do evento."
          />
          <Toggle
            checked={config.votersOnly}
            onChange={(votersOnly) => setConfig({ ...config, votersOnly })}
            label="Aceitar só eleitoras cadastradas"
            hint="Desligado, qualquer CPF válido pode votar, mesmo fora da lista."
          />
          <Toggle
            checked={config.oneVotePerDevice}
            onChange={(oneVotePerDevice) => setConfig({ ...config, oneVotePerDevice })}
            label="Permitir só um CPF por aparelho"
            hint="Bloqueia votar com outro CPF no mesmo celular. Uma aba anônima ainda passa."
          />
          <Toggle
            checked={config.oneVotePerIp}
            onChange={(oneVotePerIp) => setConfig({ ...config, oneVotePerIp })}
            label="Permitir só um voto por rede (IP)"
            hint="Deixe desligado se o público vai votar pelo mesmo Wi-Fi do evento."
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </form>
    </div>
  )
}
