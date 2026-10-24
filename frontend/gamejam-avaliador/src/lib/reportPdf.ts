import type { TeamResult, Voter, VoterRole } from '../types'
import { formatCpf } from './cpf'

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
const GREEN: Rgb = [79, 138, 18]
const MARGIN = 10

// Mesmas cores dos blocos de "DELAS" no logo: [fundo, letra].
const TILES: [Rgb, Rgb][] = [
  [[255, 209, 0], [165, 205, 57]],
  [[30, 174, 234], [255, 209, 0]],
  [[255, 209, 0], [75, 42, 143]],
  [[75, 42, 143], [30, 174, 234]],
  [[243, 146, 0], [255, 209, 0]],
]

// Estilo de tabela comum aos relatórios.
const TABLE_STYLES = {
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
  alternateRowStyles: { fillColor: [248, 251, 254] },
}

function formatScore(score: number): string {
  return score.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function dateStamp(date: Date): string {
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

interface PdfDoc {
  setFont(name: string, style: string): void
  setFontSize(size: number): void
  setTextColor(r: number, g: number, b: number): void
  setFillColor(r: number, g: number, b: number): void
  rect(x: number, y: number, w: number, h: number, style: string): void
  text(text: string, x: number, y: number, options?: { align?: string }): void
  getNumberOfPages(): number
  setPage(page: number): void
  internal: { pageSize: { getWidth(): number; getHeight(): number } }
  save(fileName: string): void
}

type AutoTable = (doc: PdfDoc, options: Record<string, unknown>) => void

async function loadPdf(): Promise<{ doc: PdfDoc; autoTable: AutoTable }> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import(/* @vite-ignore */ JSPDF_URL),
    import(/* @vite-ignore */ AUTOTABLE_URL),
  ])
  // A build ESM da CDN embrulha o CommonJS: a função pode vir em default ou default.default.
  const autoTable =
    typeof autoTableModule.default === 'function' ? autoTableModule.default : autoTableModule.default.default
  return { doc: new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as PdfDoc, autoTable }
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

// Logo, título e subtítulo no topo da primeira página. Devolve onde a tabela começa.
function drawHeader(doc: PdfDoc, subtitle: string): number {
  drawBrand(doc, MARGIN, MARGIN)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...PURPLE)
  doc.text('Ciência Delas · Game Jam 2026', MARGIN + 31, MARGIN + 5.5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...TEXT_FAINT)
  doc.text(subtitle, MARGIN + 31, MARGIN + 10.5)
  return MARGIN + 16
}

// "Página X de Y" no rodapé, depois que a tabela já definiu quantas páginas há.
function drawPageNumbers(doc: PdfDoc) {
  const total = doc.getNumberOfPages()
  if (total < 2) return
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  for (let page = 1; page <= total; page++) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...TEXT_FAINT)
    doc.text(`Página ${page} de ${total}`, width - MARGIN, height - 5, { align: 'right' })
  }
}

export async function downloadReportPdf(results: TeamResult[], generatedAt: Date): Promise<void> {
  const { doc, autoTable } = await loadPdf()
  const startY = drawHeader(doc, `Classificação final · gerado em ${dateStamp(generatedAt)}`)
  const criteria = results[0]?.criterionScores ?? []

  autoTable(doc, {
    ...TABLE_STYLES,
    startY,
    margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: MARGIN },
    head: [['Pos.', 'Jogo', 'Pontos (0-100)', 'Penalidades', ...criteria.map((c) => `${c.label} (máx. ${c.maxScore})`)]],
    body: results.map((r) => [
      `${r.rank}º`,
      r.gameTitle ? `${r.gameTitle}\n${r.teamName}` : r.teamName,
      formatScore(r.finalScore),
      r.penaltyPoints > 0 ? `-${r.penaltyPoints}` : '—',
      ...r.criterionScores.map((c) => formatScore(c.average)),
    ]),
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 46 },
      2: { cellWidth: 17, halign: 'right', fontStyle: 'bold', textColor: MAGENTA },
      3: { cellWidth: 17, halign: 'right', textColor: RED },
      ...Object.fromEntries(criteria.map((_, i) => [i + 4, { halign: 'right' }])),
    },
  })

  drawPageNumbers(doc)
  doc.save(`relatorio-ciencia-delas-${generatedAt.toISOString().slice(0, 10)}.pdf`)
}

const VOTER_LIST: Record<VoterRole, { title: string; file: string }> = {
  popular: { title: 'Eleitoras cadastradas', file: 'eleitoras' },
  jury: { title: 'Avaliadoras do júri', file: 'juri' },
}

export async function downloadVotersPdf(voters: Voter[], role: VoterRole, generatedAt: Date): Promise<void> {
  const { doc, autoTable } = await loadPdf()
  const { title, file } = VOTER_LIST[role]
  const voted = voters.filter((v) => v.hasVoted).length
  const startY = drawHeader(
    doc,
    `${title} · ${voters.length} cadastradas, ${voted} já votaram · gerado em ${dateStamp(generatedAt)}`,
  )

  autoTable(doc, {
    ...TABLE_STYLES,
    styles: { ...TABLE_STYLES.styles, fontSize: 8.5, cellPadding: 1.8 },
    headStyles: { ...TABLE_STYLES.headStyles, fontSize: 8 },
    startY,
    margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: MARGIN + 3 },
    head: [['Nº', 'Nome', 'CPF', 'Situação']],
    body: voters.map((v, i) => [
      String(i + 1),
      v.name,
      formatCpf(v.cpf),
      v.hasVoted ? `${v.evaluationCount} ${v.evaluationCount === 1 ? 'time avaliado' : 'times avaliados'}` : 'Ainda não votou',
    ]),
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      2: { cellWidth: 34 },
      3: { cellWidth: 38 },
    },
    // Destaca em verde quem já votou.
    didParseCell: (data: { section: string; column: { index: number }; row: { index: number }; cell: { styles: Record<string, unknown> } }) => {
      if (data.section === 'body' && data.column.index === 3 && voters[data.row.index]?.hasVoted) {
        data.cell.styles.textColor = GREEN
      }
    },
  })

  drawPageNumbers(doc)
  doc.save(`${file}-ciencia-delas-${generatedAt.toISOString().slice(0, 10)}.pdf`)
}
