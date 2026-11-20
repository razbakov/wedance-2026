/**
 * Unfinished "New event" (RAZ-1024).
 *
 * The page looks like steps but used to be one screen: the choice and
 * everything typed lived only in the component, so the browser's Back left
 * the page and the form was gone. The path is `?start=post|copy|scratch`
 * (a history entry), and the fields are kept in this browser until a draft
 * is created. A `?type=` / `?artist=` link still opens From scratch, and
 * does not replace a different unfinished draft until the organiser types
 * in that form.
 */

import type { EventStart } from '#shared/utils/eventStart'

export const NEW_EVENT_DRAFT_KEY = 'wedance-new-event'
export const NEW_EVENT_PATH = '/business/events/new'

const EVENT_TYPES = ['Party', 'Workshop', 'Course', 'Festival', 'Weekender', 'Congress', 'Concert', 'Show'] as const
export type NewEventType = (typeof EVENT_TYPES)[number]

/** The `?type=` / `?artist=` this scratch form belongs to. Both empty = the ordinary New event page. */
export type NewEventEntry = { type: string | null; artist: string }

export type NewEventDraft = {
  v: 1
  start: EventStart | null
  entry: NewEventEntry
  post: { url: string; profile: string }
  copy: { id: string; date: string; repeatWeeks: number }
  scratch: {
    hostUsername: string
    type: NewEventType
    styles: string[]
    date: string
    startTime: string
    name: string
    published: boolean
  }
  naming: boolean
}

export type NewEventEdited = { post: boolean; copy: boolean; scratch: boolean }

type StorageLike = {
  getItem: (key: string) => string | null
  setItem?: (key: string, value: string) => void
  removeItem?: (key: string) => void
}

export function emptyNewEventEntry(): NewEventEntry {
  return { type: null, artist: '' }
}

export function sameNewEventEntry(a: NewEventEntry, b: NewEventEntry): boolean {
  return (a.type ?? null) === (b.type ?? null) && (a.artist || '') === (b.artist || '')
}

export function parseEventStart(value: unknown): EventStart | null {
  return value === 'post' || value === 'copy' || value === 'scratch' ? value : null
}

/**
 * True when this history entry is still New event, on the choice (no path yet).
 * `history.state.back` from vue-router is an in-app path, possibly with a query.
 */
export function isNewEventChoiceUrl(href: string | null | undefined): boolean {
  if (!href || !href.startsWith('/') || href.startsWith('//') || href.startsWith('/\\')) return false
  if (href.includes('://') || /[\s\\]/.test(href)) return false
  const [pathAndQuery] = href.split('#')
  const q = pathAndQuery!.indexOf('?')
  const path = q === -1 ? pathAndQuery! : pathAndQuery!.slice(0, q)
  const search = q === -1 ? '' : pathAndQuery!.slice(q + 1)
  const normalized = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
  if (normalized !== NEW_EVENT_PATH) return false
  return parseEventStart(new URLSearchParams(search).get('start')) === null
}

/** Back goes through history when the previous entry is the choice; otherwise open the choice. */
export function newEventBackAction(historyBack: string | null | undefined): 'back' | 'push' {
  return isNewEventChoiceUrl(historyBack) ? 'back' : 'push'
}

/**
 * What to put back when the page opens, and which path to add to the URL
 * when it doesn't name one. `open` is null when the URL already has a path,
 * or when an ordinary visit should stay on the choice.
 */
export function newEventRestorePlan(
  saved: NewEventDraft | null,
  entry: NewEventEntry,
  urlStart: EventStart | null,
): { applyPost: boolean; applyCopy: boolean; applyScratch: boolean; open: EventStart | null } {
  const directed = !!(entry.type || entry.artist)
  if (!saved) {
    return { applyPost: false, applyCopy: false, applyScratch: false, open: !urlStart && directed ? 'scratch' : null }
  }
  // A link that already says what to make (`?type=` / `?artist=`) is a
  // different form. Keep the other paths, and keep this scratch only when
  // it was filled on the same link.
  const applyScratch = !directed || sameNewEventEntry(saved.entry, entry)
  const open = urlStart ? null : directed ? 'scratch' : saved.start
  return { applyPost: true, applyCopy: true, applyScratch, open }
}

/**
 * The draft to store after a change. Null means "don't write" (nothing
 * started). A directed visit that hasn't been typed in yet leaves the
 * previous draft alone, including which path it was on.
 */
export function nextNewEventDraft(
  previous: NewEventDraft | null,
  current: NewEventDraft,
  edited: NewEventEdited,
): NewEventDraft | null {
  if (!previous) {
    if (!current.start && !draftHasInput(current)) return null
    return current
  }
  const mismatch = !sameNewEventEntry(previous.entry, current.entry)
  const next: NewEventDraft = {
    v: 1,
    start: current.start,
    entry: edited.scratch || !mismatch ? current.entry : previous.entry,
    post: edited.post ? current.post : previous.post,
    copy: edited.copy ? current.copy : previous.copy,
    scratch: edited.scratch ? current.scratch : previous.scratch,
    naming: edited.scratch ? current.naming : previous.naming,
  }
  if (mismatch && !edited.scratch && !edited.post && !edited.copy) next.start = previous.start
  return next
}

export function parseNewEventDraft(raw: unknown): NewEventDraft | null {
  const text = typeof raw === 'string' ? raw : null
  if (!text) return null
  let value: unknown
  try { value = JSON.parse(text) } catch { return null }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const o = value as Record<string, unknown>
  if (o.v != null && o.v !== 1) return null
  const post = asRecord(o.post)
  const copy = asRecord(o.copy)
  const scratch = asRecord(o.scratch)
  const entry = asRecord(o.entry)
  if (!post || !copy || !scratch || !entry) return null
  const type = typeof scratch.type === 'string' && (EVENT_TYPES as readonly string[]).includes(scratch.type)
    ? scratch.type as NewEventType
    : 'Party'
  const entryType = typeof entry.type === 'string' && (EVENT_TYPES as readonly string[]).includes(entry.type)
    ? entry.type
    : null
  const styles = Array.isArray(scratch.styles)
    ? scratch.styles.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map(s => clip(s.trim(), 40)).slice(0, 20)
    : []
  const name = clip(asString(scratch.name), 160)
  return {
    v: 1,
    start: parseEventStart(o.start),
    entry: { type: entryType, artist: clip(asString(entry.artist).replace(/^@/, ''), 80) },
    post: { url: clip(asString(post.url).trim(), 500), profile: clip(asString(post.profile).trim(), 80) },
    copy: {
      id: clip(asString(copy.id).trim(), 128),
      date: isoDate(copy.date),
      repeatWeeks: repeatWeeks(copy.repeatWeeks),
    },
    scratch: {
      hostUsername: clip(asString(scratch.hostUsername).trim(), 80),
      type,
      styles,
      date: isoDate(scratch.date),
      startTime: clock(scratch.startTime),
      name,
      published: scratch.published === true,
    },
    naming: o.naming === true || !!name,
  }
}

export function readNewEventDraft(storage: Pick<StorageLike, 'getItem'> | null): NewEventDraft | null {
  if (!storage) return null
  try { return parseNewEventDraft(storage.getItem(NEW_EVENT_DRAFT_KEY)) } catch { return null }
}

export function writeNewEventDraft(storage: StorageLike | null, draft: NewEventDraft): void {
  if (!storage?.setItem) return
  try { storage.setItem(NEW_EVENT_DRAFT_KEY, JSON.stringify(draft)) } catch { /* quota or private mode */ }
}

export function clearNewEventDraft(storage: StorageLike | null): void {
  if (!storage?.removeItem) return
  try { storage.removeItem(NEW_EVENT_DRAFT_KEY) } catch { /* ignore */ }
}

function draftHasInput(d: NewEventDraft): boolean {
  const s = d.scratch
  return !!(
    d.post.url || d.post.profile || d.copy.id || d.copy.date || d.copy.repeatWeeks ||
    s.hostUsername || s.date || s.name || s.styles.length || s.published || d.naming ||
    s.type !== 'Party' || s.startTime !== '20:00'
  )
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function clip(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value
}

function isoDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return ''
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1, d!))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m! - 1 || dt.getUTCDate() !== d) return ''
  return value
}

function clock(value: unknown): string {
  if (typeof value !== 'string') return '20:00'
  const m = value.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/)
  return m ? `${m[1]}:${m[2]}` : '20:00'
}

function repeatWeeks(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : 0
  if (!Number.isFinite(n)) return 0
  return Math.min(12, Math.max(0, Math.round(n)))
}
