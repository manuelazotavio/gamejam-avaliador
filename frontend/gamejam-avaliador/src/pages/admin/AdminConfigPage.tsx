import { useEffect, useState, type FormEvent } from 'react'
import { Loader } from '../../components/Loader'
import { useToast } from '../../context/useToast'
import { getCurrentPosition } from '../../lib/geo'
import { getConfig, updateConfig } from '../../services/db'
import type { EventConfig } from '../../types'

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

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 20,
            fontSize: 14,
            color: 'var(--text-dim)',
          }}
        >
          <input
            type="checkbox"
            checked={config.votingOpen}
            onChange={(e) => setConfig({ ...config, votingOpen: e.target.checked })}
          />
          Votação aberta
        </label>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </form>
    </div>
  )
}
