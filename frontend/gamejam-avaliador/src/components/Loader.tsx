export function Loader({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', padding: '48px 0' }}>
      <span className="spinner" />
      <span style={{ color: 'var(--text-faint)', fontSize: 14 }}>{label}</span>
    </div>
  )
}
