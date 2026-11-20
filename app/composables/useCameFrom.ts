import { cleanCameFrom, type CameFrom } from '#shared/utils/cameFrom'

/** Where this visit came from (RAZ-1074), or undefined when nothing is known. Read when sending a sign-up. */
export function cameFrom(): CameFrom | undefined {
  if (import.meta.server) return undefined
  try {
    const raw = sessionStorage.getItem('wd_came_from')
    const c = raw ? cleanCameFrom(JSON.parse(raw)) : {}
    return Object.keys(c).length ? c : undefined
  } catch { return undefined }
}
