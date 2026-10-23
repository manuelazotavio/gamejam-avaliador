import type { TeamResult } from '../types'

// jsPDF vem da CDN só quando o admin pede o PDF: não pesa no site do público
// e não exige mudar as dependências do build.
const JSPDF_URL = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm'
const AUTOTABLE_URL = 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/+esm'

type Rgb = [number, number, number]

const PURPLE: Rgb = [75, 42, 143]
const MAGENTA: Rgb = [229, 9, 127]
const SKY: Rgb = [214, 239, 251]
const TEXT_FAINT: Rgb = [138, 132, 173]
const RED: Rgb = [209, 41, 63]

// Mesmas cores dos blocos de "DELAS" no logo: [fundo, letra].
const TILES: [Rgb, Rgb][] = [
  [[255, 209, 0], [165, 205, 57]],
  [[30, 174, 234], [255, 209, 0]],
  [[255, 209, 0], [75, 42, 143]],
  [[75, 42, 143], [30, 174, 234]],
  [[243, 146, 0], [255, 209, 0]],
]

function formatScore(score: number): string {
  return score.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface PdfDoc {
  setFont(name: string, style: string): void
  setFontSize(size: number): void
  setTextColor(r: number, g: number, b: number): void
  setFillColor(r: number, g: number, b: number): void
  rect(x: number, y: number, w: number, h: number, style: string): void
  text(text: string, x: number, y: number, options?: { align?: string }): void
  save(fileName: string): void
}

function drawBrand(doc: PdfDoc, x: number, y: number) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...PURPLE)
  doc.text('CIÊNCIA', x + 12.5, y + 4, { align: 'center' })
  ;['D', 'E', 'L', 'A', 'S'].forEach((letter, i) => {
    const [fill, color] = TILES[i]
    doc.setFillColor(...fill)
    doc.rect(x + i * 5, y + 5.2, 5, 6, 'F')
    doc.setTextColor(...color)
    doc.text(letter, x + i * 5 + 2.5, y + 9.8, { align: 'center' })
  })
}

export async function downloadReportPdf(results: TeamResult[], generatedAt: Date): Promise<void> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import(/* @vite-ignore */ JSPDF_URL),
    import(/* @vite-ignore */ AUTOTABLE_URL),
  ])
  // A build ESM da CDN embrulha o CommonJS: a função pode vir em default ou default.default.
  const autoTable =
    typeof autoTableModule.default === 'function' ? autoTableModule.default : autoTableModule.default.default

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as PdfDoc
  const margin = 10

  drawBrand(doc, margin, margin)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...PURPLE)
  doc.text('Ciência Delas · Game Jam 2026', margin + 31, margin + 5.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...TEXT_FAINT)
  doc.text(
    `Classificação final · gerado em ${generatedAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`,
    margin + 31,
    margin + 10.5,
  )

  const criteria = results[0]?.criterionScores ?? []

  autoTable(doc, {
    startY: margin + 16,
    margin: { left: margin, right: margin, top: margin, bottom: margin },
    head: [['Pos.', 'Jogo', 'Pontos (0-100)', 'Penalidades', ...criteria.map((c) => `${c.label} (máx. ${c.maxScore})`)]],
    body: results.map((r) => [
      `${r.rank}º`,
      r.gameTitle ? `${r.gameTitle}\n${r.teamName}` : r.teamName,
      formatScore(r.finalScore),
      r.penaltyPoints > 0 ? `-${r.penaltyPoints}` : '—',
      ...r.criterionScores.map((c) => formatScore(c.average)),
    ]),
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 1.6,
      textColor: [43, 26, 92],
      lineColor: [225, 222, 236],
      lineWidth: 0.2,
      valign: 'middle',
    },
    headStyles: { fillColor: SKY, textColor: PURPLE, fontStyle: 'bold', fontSize: 6.5, valign: 'bottom' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 46 },
      2: { cellWidth: 17, halign: 'right', fontStyle: 'bold', textColor: MAGENTA },
      3: { cellWidth: 17, halign: 'right', textColor: RED },
      ...Object.fromEntries(criteria.map((_, i) => [i + 4, { halign: 'right' }])),
    },
    alternateRowStyles: { fillColor: [248, 251, 254] },
  })

  doc.save(`relatorio-ciencia-delas-${generatedAt.toISOString().slice(0, 10)}.pdf`)
}
