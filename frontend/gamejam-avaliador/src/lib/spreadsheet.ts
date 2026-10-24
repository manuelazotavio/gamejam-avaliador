// Lê planilhas (.xlsx/.xls) da importação de eleitoras e júri.
// A SheetJS vem da CDN oficial só quando alguém escolhe uma planilha: não pesa no
// site do público e não exige mudar as dependências do build.
const SHEETJS_URL = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs'

export function isSpreadsheet(file: File): boolean {
  return /\.(xlsx|xls)$/i.test(file.name)
}

type Cell = string | number | boolean | null | undefined

function onlyDigits(value: Cell): string {
  return String(value ?? '').replace(/\D/g, '')
}

// O Excel guarda CPF como número e some com os zeros à esquerda (012... vira 12...).
function normalizeCpf(value: Cell): string {
  const digits = onlyDigits(value)
  return typeof value === 'number' && digits.length < 11 ? digits.padStart(11, '0') : digits
}

function looksLikeCpf(value: Cell): boolean {
  const digits = normalizeCpf(value)
  return digits.length === 11
}

/**
 * Converte a primeira aba em linhas "cpf, nome".
 * Usa as colunas com cabeçalho "CPF" e "Nome" quando existem; senão, acha a coluna
 * que parece CPF e usa a primeira coluna de texto ao lado como nome.
 */
export async function readVoterSpreadsheet(file: File): Promise<string[]> {
  const XLSX = await import(/* @vite-ignore */ SHEETJS_URL)
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = (XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, blankrows: false }) as Cell[][]).filter(
    (row) => row.some((cell) => String(cell ?? '').trim() !== ''),
  )
  if (rows.length === 0) return []

  const header = rows[0].map((cell) => String(cell ?? '').trim().toLowerCase())
  let cpfCol = header.findIndex((name) => name.includes('cpf'))
  let nameCol = header.findIndex((name) => name.includes('nome'))
  const hasHeader = cpfCol !== -1

  if (!hasHeader) {
    const width = Math.max(...rows.map((row) => row.length))
    cpfCol = Array.from({ length: width }, (_, col) => col).find((col) => rows.some((row) => looksLikeCpf(row[col]))) ?? 0
  }
  if (nameCol === -1) {
    const width = Math.max(...rows.map((row) => row.length))
    nameCol =
      Array.from({ length: width }, (_, col) => col).find(
        (col) => col !== cpfCol && rows.some((row) => typeof row[col] === 'string' && !looksLikeCpf(row[col])),
      ) ?? -1
  }

  return rows
    .slice(hasHeader ? 1 : 0)
    .map((row) => {
      const cpf = normalizeCpf(row[cpfCol])
      const name = nameCol === -1 ? '' : String(row[nameCol] ?? '').trim()
      return name ? `${cpf}, ${name}` : cpf
    })
    .filter((line) => line !== '')
}
