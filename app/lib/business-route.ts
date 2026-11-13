/**
 * The sidebar profile switcher and /business/network/<handle>/… pages stay in
 * step both ways: opening a page of a profile selects it, and switching the
 * profile opens the same section for the new one ("All" → Network).
 */

/** /business/network/<handle>[/<section>] → its handle and section ('' = the editor). */
export function profileRoute(path: string): { handle: string; section: string } | null {
  const m = /^\/business\/network\/([^/]+)(?:\/([^/]+))?\/?$/.exec(path)
  return m ? { handle: decodeURIComponent(m[1]!), section: m[2] ?? '' } : null
}

/** Where to go when the switcher changes to `profile` ('' = all) on `path`; null = stay. */
export function switchTarget(path: string, profile: string): string | null {
  const r = profileRoute(path)
  if (!r || r.handle === profile) return null
  if (!profile) return '/business/network'
  return `/business/network/${encodeURIComponent(profile)}${r.section ? `/${r.section}` : ''}`
}
