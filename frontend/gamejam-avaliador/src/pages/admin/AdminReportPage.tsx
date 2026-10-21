import { useEffect, useState } from 'react'
import { BrandMark } from '../../components/BrandMark'
import { Loader } from '../../components/Loader'
import { getResults } from '../../services/db'
import type { TeamResult } from '../../types'

interface Report {
  results: TeamResult[]
  generatedAt: Date
}

function formatScore(score: number): string {
  return score.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function gameName(result: TeamResult): string {
  return result.gameTitle || result.teamName
}

// CSV no padrão do Excel em português: ";" separa colunas, vírgula decimal e BOM para os acentos.
function toCsv(results: TeamResult[]): string {
  const criteria = results[0]?.criterionScores ?? []
  const header = [
    'Posição',
    'Jogo',
    'Time',
    'Pontos (0-100)',
    'Jurados',
    'Visitantes',
    ...criteria.map((c) => `${c.label} (máx. ${c.maxScore})`),
  ]
  const rows = results.map((r) => [
    `${r.rank}º`,
    gameName(r),
    r.teamName,
    formatScore(r.finalScore),
    String(r.juryCount),
    String(r.popularCount),
    ...r.criterionScores.map((c) => formatScore(c.average)),
  ])
  const escape = (value: string) => (/[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)
  return '﻿' + [header, ...rows].map((row) => row.map(escape).join(';')).join('\r\n')
}

function downloadCsv(report: Report) {
  const blob = new Blob([toCsv(report.results)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `relatorio-ciencia-delas-${report.generatedAt.toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function AdminReportPage() {
  const [report, setReport] = useState<Report | null>(null)

  useEffect(() => {
    getResults().then((results) => setReport({ results, generatedAt: new Date() }))
  }, [])

  // A tabela é larga: o PDF sai em paisagem, só a partir desta página.
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = '@page { size: A4 landscape; margin: 12mm; }'
    document.head.appendChild(style)
    return () => style.remove()
  }, [])

  if (!report) return <Loader label="Montando relatório..." />

  const criteria = report.results[0]?.criterionScores ?? []

  return (
    <div className="report">
      <div className="admin-header no-print">
        <div>
          <span className="eyebrow">relatório</span>
          <h1 style={{ fontSize: 28, marginTop: 8 }}>Relatório da Game Jam</h1>
          <p style={{ marginTop: 6 }}>Classificação final com a pontuação de cada critério.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => window.print()}>
            Baixar PDF
          </button>
          <button className="btn btn-ghost" onClick={() => downloadCsv(report)}>
            Baixar planilha
          </button>
        </div>
      </div>

      <div className="report__sheet">
        <header className="report__head">
          <BrandMark size="sm" />
          <div>
            <h2>Ciência Delas · Game Jam 2026</h2>
            <p>
              Classificação final · gerado em{' '}
              {report.generatedAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          </div>
        </header>

        <div className="scroll-table">
          <table className="data-table report__table">
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Jogo</th>
                <th>Pontos (0-100)</th>
                <th>Votantes</th>
                {criteria.map((c) => (
                  <th key={c.criterion}>
                    {c.label} <span className="report__max">(máx. {c.maxScore})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.results.map((r) => (
                <tr key={r.teamId}>
                  <td>{r.rank}º</td>
                  <td>
                    <strong>{gameName(r)}</strong>
                    {r.gameTitle && <div className="report__team">{r.teamName}</div>}
                  </td>
                  <td>
                    <strong>{formatScore(r.finalScore)}</strong>
                  </td>
                  <td className="report__voters">
                    {r.juryCount} avaliador(es) do júri e {r.popularCount} visitante(s)
                  </td>
                  {r.criterionScores.map((c) => (
                    <td key={c.criterion}>{formatScore(c.average)}</td>
                  ))}
                </tr>
              ))}
              {report.results.length === 0 && (
                <tr>
                  <td colSpan={4 + criteria.length} style={{ textAlign: 'center', color: 'var(--text-faint)' }}>
                    Nenhum time cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
