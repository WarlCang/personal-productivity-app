export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/** Stable, tag-friendly id derived from a user-typed name, unique among `taken`. */
export function slugId(name: string, taken: Set<string>): string {
  const base =
    name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-一-龥]/g, '')
      .slice(0, 24) || 'custom'
  let id = base
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`
  return id
}
