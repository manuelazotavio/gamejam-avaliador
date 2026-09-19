import { useEffect, useRef, useState } from 'react'
import { Loader } from '../../components/Loader'
import { useToast } from '../../context/useToast'
import { formatCpf } from '../../lib/cpf'
import { importVoters, listVoters, removeVoter, type VoterImportRow } from '../../services/db'
import type { Voter } from '../../types'

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

export function AdminVotersPage() {
  const { notify } = useToast()
  const [voters, setVoters] = useState<Voter[] | null>(null)
  const [text, setText] = useState('')
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    setVoters(await listVoters())
  }

  useEffect(() => {
    listVoters().then(setVoters)
  }, [])

  async function handleImport() {
    const rows = parseVoterRows(text)
    if (rows.length === 0) {
      notify('Cole ao menos um CPF para importar.', 'error')
      return
    }
    setImporting(true)
    try {
      const summary = await importVoters(rows)
      notify(
        `${summary.added} adicionadas, ${summary.duplicated} duplicadas, ${summary.invalid} inválidas.`,
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
    if (!confirm(`Remover ${voter.name} da lista de eleitoras?`)) return
    await removeVoter(voter.cpf)
    notify('Eleitora removida.', 'info')
    await refresh()
  }

  return (
    <div>
      <div className="admin-header">
        <div>
          <span className="eyebrow">eleitoras</span>
          <h1 style={{ fontSize: 28, marginTop: 8 }}>Importar eleitoras</h1>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 28 }}>
        <h3 style={{ marginBottom: 6 }}>Colar lista ou importar CSV</h3>
        <p style={{ marginBottom: 16 }}>
          Um registro por linha, no formato <code>cpf, nome</code>. Só CPFs desta lista poderão votar.
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
                      {voter.hasVoted ? 'Votou' : 'Pendente'}
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
                    Nenhuma eleitora importada ainda.
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
