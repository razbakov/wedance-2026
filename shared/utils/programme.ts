/**
 * An event's programme lives in `events.festival.sessions` for every event
 * type (a party is a one-day festival). The one-line `agenda` ({time, what})
 * is the format from before the programme: still read, never written.
 *
 * Shared by the business editor (BusinessEventForm) and the MCP tools, so an
 * event made in the editor and one made by an AI assistant look the same.
 */
import type { FestivalDetails, FestivalSession } from '../types/festivalDetails'

export type AgendaLine = { time: string; what: string }
/** The event details container without its server-set key. */
export type EventDetails = Omit<FestivalDetails, 'key'>

/** The details a new event starts with in the editor (empty programme, passes, info). */
export const emptyEventDetails = (): EventDetails => ({ socialLinks: [], practicalInfo: [], passes: [], sessions: [], videos: {} })

/** Agenda lines that look like a party (the rest are workshops). */
export const PARTY = /party|social|dj|concert|show|live|open floor|fiesta|baile/i

/** A new session id: stable once saved (dancers' picks hang on it). */
export const newSessionId = (i = 0) => `s-${Math.random().toString(36).slice(2, 8)}${i}`

/** Default length in minutes: a party runs the night, a workshop an hour. */
export const defaultDuration = (type: FestivalSession['type']) => (type === 'party' ? 240 : 60)

/** "9:00" → "09:00"; anything that isn't a clock time → null. */
export function clockTime(t: string | null | undefined): string | null {
  const s = (t ?? '').trim()
  return /^\d{1,2}:\d{2}$/.test(s) ? s.padStart(5, '0') : null
}

/** The old agenda as programme sessions on the event's day (the editor's "Put it in the programme"). */
export function agendaToSessions(agenda: AgendaLine[], at: { date: string; startTime: string }): FestivalSession[] {
  return agenda.filter(a => a.what?.trim()).map((a, i) => {
    const type: FestivalSession['type'] = PARTY.test(a.what) ? 'party' : 'workshop'
    return {
      id: newSessionId(i),
      date: at.date,
      time: clockTime(a.time) ?? at.startTime,
      duration: defaultDuration(type),
      type,
      title: a.what.trim(),
      artist: '',
      style: '',
      level: 'Beginner',
    }
  })
}

/** The old agenda an event still shows as "Your earlier agenda": only while it has no programme. */
export function legacyAgendaOf(e: { agenda?: AgendaLine[] | null; festival?: { sessions?: unknown[] } | null }): AgendaLine[] {
  if (e.festival?.sessions?.length) return []
  return (e.agenda ?? []).filter(a => a.what?.trim())
}
