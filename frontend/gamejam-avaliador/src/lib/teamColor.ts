const PALETTE = ['var(--pink)', 'var(--violet)', 'var(--teal)', 'var(--gold)', 'var(--green)', 'var(--red)']

export function colorForTeam(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}
