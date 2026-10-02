import { useEffect, useState } from 'react'
import { Loader } from '../../components/Loader'
import { listTeams } from '../../services/db'
import type { Team } from '../../types'

interface TeamQr {
  team: Team
  url: string
  image: string
}

function voteUrl(team: Team): string {
  return `${window.location.origin}/votar?time=${team.id}`
}

function fileName(team: Team): string {
  const slug = team.gameTitle
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `qr-${slug || team.id}.png`
}

export function AdminQrCodesPage() {
  const [items, setItems] = useState<TeamQr[] | null>(null)

  useEffect(() => {
    // A biblioteca de QR é pesada: só carrega quando esta página abre.
    Promise.all([listTeams(), import('qrcode')])
      .then(([teams, { default: QRCode }]) =>
        Promise.all(
          teams.map(async (team) => {
            const url = voteUrl(team)
            const image = await QRCode.toDataURL(url, { width: 600, margin: 2, errorCorrectionLevel: 'M' })
            return { team, url, image }
          }),
        ),
      )
      .then(setItems)
  }, [])

  if (!items) return <Loader label="Gerando QR codes..." />

  return (
    <div>
      <div className="admin-header">
        <div>
          <span className="eyebrow">qr codes</span>
          <h1 style={{ fontSize: 28, marginTop: 8 }}>QR code de cada time</h1>
        </div>
        <button className="btn btn-primary no-print" onClick={() => window.print()} disabled={items.length === 0}>
          Imprimir todos
        </button>
      </div>

      <p className="no-print" style={{ marginBottom: 24 }}>
        Cada QR abre direto a avaliação do time. Os links usam o endereço em que você está agora
        ({window.location.origin}); gere os QR codes pelo endereço final do site.
      </p>

      {items.length === 0 && <div className="empty-state">Nenhum time cadastrado ainda.</div>}

      <div className="qr-grid">
        {items.map(({ team, url, image }) => (
          <div key={team.id} className="card qr-card">
            <img src={image} alt={`QR code para avaliar ${team.gameTitle}`} />
            <strong className="qr-card__game">{team.gameTitle}</strong>
            <span>{team.name}</span>
            <span className="qr-card__url">{url}</span>
            <a className="btn btn-ghost btn-sm no-print" href={image} download={fileName(team)}>
              Baixar PNG
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
