/**
 * A failed event save, in words (RAZ-991). The tRPC client hands back a zod
 * refusal as its JSON issue list ("[ { "code": "too_big", "path": [...] } ]");
 * this turns each issue into a sentence that names the field the organiser sees
 * ("Practical info, line 12 is too long: keep it under 2000 characters.") and
 * keeps the dot paths, so the editor can open the card the field lives in.
 */

type Issue = { code?: string; origin?: string; maximum?: number | bigint; minimum?: number | bigint; path?: (string | number)[]; message?: string }

export type SaveError = {
  /** One readable message (several issues joined), ready for the save bar. */
  message: string
  /** Dot paths of the refused fields, e.g. `festival.practicalInfo.11`. */
  paths: string[]
}

/** Where a field lives in the event editor: the card to open for it. */
export function eventErrorCard(path: string): string | null {
  const [top, sub] = path.split('.')
  if (top === 'artists' || top === 'flyerOptions') return 'lineup'
  if (top === 'coOrganizers' || top === 'name' || top === 'type' || top === 'styles' || top === 'description' || top === 'hostUsername') return 'event'
  if (top === 'date' || top === 'startTime' || top === 'endTime' || top === 'endDate') return 'when'
  if (top === 'city' || top.startsWith('venue')) return 'where'
  if (top === 'price' || top === 'ticketUrl') return 'entry'
  if (top === 'agenda') return 'agenda'
  if (top === 'festival') {
    if (sub === 'practicalInfo') return 'where'
    if (sub === 'passes') return 'entry'
    if (sub === 'sessions') return 'agenda'
    if (sub === 'videos') return 'lineup'
  }
  return null
}

const FIELD: Record<string, string> = {
  artists: 'The line-up', coOrganizers: 'Co-organisers', name: 'The name', type: 'The type', styles: 'Music',
  description: 'The description', price: 'The price', ticketUrl: 'The ticket link', cover: 'The cover photo',
  city: 'The city', venueName: 'The venue name', venueAddress: 'The venue address', agenda: 'The agenda',
  date: 'The date', startTime: 'The start time', endTime: 'The end time', endDate: 'The last day',
}
const SUB: Record<string, string> = {
  practicalInfo: 'Practical info', passes: 'Pass', sessions: 'Programme item', socialLinks: 'Link',
  logo: 'The logo', accentColor: 'The colour', videos: 'A video link',
}
const PART: Record<string, string> = {
  description: 'what’s included', name: 'name', price: 'price', days: 'days',
  title: 'title', artist: 'artist', with: 'artists', room: 'room', venue: 'venue', time: 'time', url: 'link',
}

/** The field a path names, as the organiser sees it: `festival.practicalInfo.11` → "Practical info, line 12". */
export function eventFieldLabel(path: (string | number)[]): string {
  const [top, sub, i, part] = path
  if (top === 'festival' && typeof sub === 'string') {
    const what = SUB[sub] ?? sub
    if (typeof i !== 'number') return what
    if (sub === 'practicalInfo') return `${what}, line ${i + 1}`
    return [`${what} ${i + 1}`, typeof part === 'string' ? PART[part] ?? part : ''].filter(Boolean).join(', ')
  }
  const name = FIELD[String(top)] ?? String(top ?? 'A field')
  return typeof sub === 'number' ? `${name}, item ${sub + 1}` : name
}

function issueText(issue: Issue): string {
  const field = eventFieldLabel(issue.path ?? [])
  const msg = issue.message ?? ''
  // zod's own wording ("Too big: expected …") is rewritten; our own messages ("Name every pass.") stay.
  const isDefault = /^(Too (big|small)|Invalid|Expected)/.test(msg) || !msg
  if (!isDefault) return msg
  const max = issue.maximum != null ? Number(issue.maximum) : null
  const min = issue.minimum != null ? Number(issue.minimum) : null
  if (issue.code === 'too_big' && max != null) {
    return issue.origin === 'array'
      ? `${field} has too many entries: keep it to ${max}.`
      : issue.origin === 'number' ? `${field} is too high: at most ${max}.` : `${field} is too long: keep it under ${max} characters.`
  }
  if (issue.code === 'too_small' && min != null) {
    return issue.origin === 'number' ? `${field} is too low: at least ${min}.` : `${field} can’t be empty.`
  }
  if (issue.code === 'invalid_format' && (issue as { format?: string }).format === 'url') return `${field} isn’t a link: paste the full link, starting with https://`
  return `${field} isn’t valid.`
}

/** Parse a zod issue list out of an error message; null when it isn't one. */
export function zodIssues(message: string | undefined | null): Issue[] | null {
  const m = message?.trim()
  if (!m || !m.startsWith('[')) return null
  try {
    const parsed = JSON.parse(m)
    return Array.isArray(parsed) && parsed.length && parsed.every(x => x && typeof x === 'object' && Array.isArray(x.path)) ? parsed : null
  } catch {
    return null
  }
}

/** Any thrown save error → a readable message (+ the refused fields' paths). */
export function readableSaveError(e: unknown, fallback = 'Could not save.'): SaveError {
  const message = (e as { message?: string } | null)?.message
  const issues = zodIssues(message)
  if (!issues) return { message: message || fallback, paths: [] }
  const texts = [...new Set(issues.map(issueText))]
  return {
    message: `Not saved. ${texts.join(' ')}`,
    paths: issues.map(i => (i.path ?? []).join('.')),
  }
}
