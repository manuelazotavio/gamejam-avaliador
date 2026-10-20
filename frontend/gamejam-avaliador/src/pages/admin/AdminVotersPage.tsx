import { useEffect, useRef, useState } from 'react'
import { Loader } from '../../components/Loader'
import { useToast } from '../../context/useToast'
import { formatCpf } from '../../lib/cpf'
import { importVoters, listVoters, removeVoter, type VoterImportRow } from '../../services/db'
import type { Voter, VoterRole } from '../../types'

const COPY: Record<VoterRole, { eyebrow: string; title: string; help: string; removed: string; empty: string; one: string }> = {
  popular: {
    eyebrow: 'eleitoras',
    title: 'Importar eleitoras',
    help: 'Só CPFs desta lista votam no voto popular (com a opção "Aceitar só eleitoras cadastradas" ligada).',
    removed: 'Eleitora removida.',
    empty: 'Nenhuma eleitora importada ainda.',
    one: 'da lista de eleitoras',
  },
  jury: {
    eyebrow: 'júri',
    title: 'Avaliadoras do júri',
    help: 'Quem está nesta lista avalia com os pesos dos critérios. Um CPF que já estava na lista do público passa para o júri.',
    removed: 'Avaliadora removida do júri.',
    empty: 'Nenhuma avaliadora do júri cadastrada ainda.',
    one: 'do júri',
  },
}

function parseVoterRows(text: string): VoterImportRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [cpf, ...rest] = line.split(/[,;\t]/)
      return { cpf: cpf.trim(), name: rest.join(' ').trim() }
    })
}

export function AdminVotersPage({ role = 'popular' }: { role?: VoterRole }) {
  const copy = COPY[role]
  const { notify } = useToast()
  const [voters, setVoters] = useState<Voter[] | null>(null)
  const [text, setText] = useState('')
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    setVoters(await listVoters(role))
  }

  useEffect(() => {
    listVoters(role).then(setVoters)
  }, [role])

  async function handleImport() {
    const rows = parseVoterRows(text)
    if (rows.length === 0) {
      notify('Cole ao menos um CPF para importar.', 'error')
      return
    }
    setImporting(true)
    try {
      const summary = await importVoters(rows, role)
      notify(
        `${summary.added} salvas, ${summary.duplicated} já cadastradas, ${summary.invalid} inválidas.`,
        summary.added > 0 ? 'success' : 'info',
      )
      setText('')
      await refresh()
    } finally {
      setImporting(false)
    }
  }

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => setText((prev) => (prev ? `${prev}\n${reader.result}` : String(reader.result)))
    reader.readAsText(file)
  }

  async function handleRemove(voter: Voter) {
    if (!confirm(`Remover ${voter.name} ${copy.one}?`)) return
    await removeVoter(voter.cpf)
    notify(copy.removed, 'info')
    await refresh()
  }

  return (
    <div>
      <div className="admin-header">
        <div>
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1 style={{ fontSize: 28, marginTop: 8 }}>{copy.title}</h1>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 28 }}>
        <h3 style={{ marginBottom: 6 }}>Colar lista ou importar CSV</h3>
        <p style={{ marginBottom: 16 }}>
          Um registro por linha, no formato <code>cpf, nome</code>. {copy.help}
        </p>
        <textarea
          className="input"
          rows={6}
          placeholder={'123.456.789-09, Maria Silva\n987.654.321-00, Joana Souza'}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
            {importing ? 'Importando...' : 'Importar'}
          </button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            Escolher arquivo .csv
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            hidden
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      </div>

      {voters === null && <Loader />}

      {voters !== null && (
        <div className="scroll-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {voters.map((voter) => (
                <tr key={voter.cpf}>
                  <td>{voter.name}</td>
                  <td>{formatCpf(voter.cpf)}</td>
                  <td>
                    <span className={`badge ${voter.hasVoted ? 'badge--good' : 'badge--warn'}`}>
                      {voter.hasVoted
                        ? `${voter.evaluationCount} ${voter.evaluationCount === 1 ? 'time avaliado' : 'times avaliados'}`
                        : 'Pendente'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleRemove(voter)}>
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
              {voters.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-faint)' }}>
                    {copy.empty}
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
