// Format vote counts like Realms:
// - If tokens < 1, show raw value (integer)
// - Otherwise show tokens with compact format

export function formatVoteCount(tokens: number, raw?: number): string {
  // If no raw value or tokens >= 1, use tokens
  if (raw === undefined || tokens >= 1) {
    return compact(tokens)
  }

  // If tokens < 1, show raw value
  return raw.toLocaleString()
}

function compact(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}
