const PALETTE = ['var(--magenta)', 'var(--cyan-dim)', 'var(--purple)', 'var(--orange)', '#6f9a1a', '#c2187a']

export function colorForTeam(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}
