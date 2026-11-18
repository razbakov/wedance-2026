/**
 * The door list (RAZ-928): who an organiser can expect tonight, one row per
 * person, from the RSVP poll (not "next time"), Going!, tickets and — when
 * the event is a festival — its passes. Signed-out guests keep the name they
 * typed. Never an email or a phone.
 *
 * Check-in targets: a dancer's attendance when they have one, else their
 * dancer id (the server creates the attendance), a guest RSVP id, or an
 * unclaimed pass id. Exactly one of those is set.
 */
import { RSVP_ANSWERS, type RsvpAnswer } from './rsvp'

export type DoorVia = 'rsvp' | 'going' | 'ticket'

export interface DoorPoll {
  id: string
  dancerId: string | null
  answer: string
  confirmed: boolean
  /** Name a signed-out guest typed. Ignored once they have an account. */
  name: string | null
  partnerName: string | null
  checkedIn: boolean
}

export interface DoorAttendance {
  id: string
  dancerId: string | null
  status: string
  checkedIn: boolean
}

export interface DoorPlan {
  dancerId: string
}

/** A festival pass. `stub` is an unclaimed paid/verified pass the door can still mark. */
export interface DoorPass {
  id: string
  dancerId: string | null
  ticket: boolean
  stub: boolean
}

export interface DoorPerson {
  id: string
  name: string | null
  photo: string | null
}

export interface DoorRows {
  polls: readonly DoorPoll[]
  attendances: readonly DoorAttendance[]
  plans: readonly DoorPlan[]
  passes: readonly DoorPass[]
  people: readonly DoorPerson[]
}

export interface DoorGuest {
  key: string
  name: string
  photo: string | null
  via: DoorVia
  answer: RsvpAnswer | null
  partnerName: string | null
  confirmed: boolean
  checkedIn: boolean
  attendanceId: string | null
  dancerId: string | null
  rsvpId: string | null
  signupId: string | null
}

const PLACEHOLDER = new Set(['Guest', 'Ticket', 'Dancer'])

function comingAnswer(answer: string): RsvpAnswer | null {
  if (answer === 'next') return null
  return (RSVP_ANSWERS as readonly string[]).includes(answer) ? answer as RsvpAnswer : null
}

function blankGuest(): Omit<DoorGuest, 'key' | 'name' | 'via'> {
  return {
    photo: null, answer: null, partnerName: null, confirmed: true, checkedIn: false,
    attendanceId: null, dancerId: null, rsvpId: null, signupId: null,
  }
}

/** One row per person expected at the door, named people first, then A→Z. */
export function buildDoorList(rows: DoorRows): DoorGuest[] {
  const byDancer = new Map<string, DoorGuest>()
  const anon: DoorGuest[] = []
  const person = (id: string) => rows.people.find(p => p.id === id)

  const ensure = (dancerId: string): DoorGuest => {
    let row = byDancer.get(dancerId)
    if (!row) {
      const p = person(dancerId)
      row = {
        ...blankGuest(),
        key: dancerId,
        name: p?.name?.trim() || 'Dancer',
        photo: p?.photo ?? null,
        via: 'going',
        dancerId,
      }
      byDancer.set(dancerId, row)
    }
    return row
  }

  for (const p of rows.plans) ensure(p.dancerId)

  for (const r of rows.polls) {
    const answer = comingAnswer(r.answer)
    if (!answer) continue
    const partnerName = answer === 'partner' ? (r.partnerName?.trim() || null) : null
    if (r.dancerId) {
      const row = ensure(r.dancerId)
      row.answer = answer
      row.partnerName = partnerName
      row.confirmed = r.confirmed
      row.checkedIn ||= r.checkedIn
      if (row.via !== 'ticket') row.via = 'rsvp'
    } else {
      anon.push({
        ...blankGuest(),
        key: `rsvp:${r.id}`,
        name: r.name?.trim() || 'Guest',
        via: 'rsvp',
        answer,
        partnerName,
        confirmed: r.confirmed,
        checkedIn: r.checkedIn,
        rsvpId: r.id,
      })
    }
  }

  for (const a of rows.attendances) {
    if (a.status !== 'going' && a.status !== 'ticket_holder') continue
    const ticket = a.status === 'ticket_holder'
    if (a.dancerId) {
      const row = ensure(a.dancerId)
      row.attendanceId = a.id
      row.checkedIn ||= a.checkedIn
      if (ticket) row.via = 'ticket'
    } else if (ticket) {
      anon.push({
        ...blankGuest(),
        key: `ticket:${a.id}`,
        name: 'Ticket',
        via: 'ticket',
        checkedIn: a.checkedIn,
        attendanceId: a.id,
      })
    }
  }

  for (const pass of rows.passes) {
    if (pass.dancerId) {
      const row = ensure(pass.dancerId)
      if (pass.ticket) row.via = 'ticket'
    } else if (pass.stub) {
      anon.push({
        ...blankGuest(),
        key: `pass:${pass.id}`,
        name: 'Ticket',
        via: pass.ticket ? 'ticket' : 'going',
        confirmed: false,
        signupId: pass.id,
      })
    }
  }

  const all = [...byDancer.values(), ...anon]
  return all.sort((a, b) =>
    Number(PLACEHOLDER.has(a.name)) - Number(PLACEHOLDER.has(b.name))
    || a.name.localeCompare(b.name))
}

/** Search needle: lower case, accents folded, so "Jose" finds "José". */
export function foldDoorQuery(q: string): string {
  return q.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

/** A guest matches when their name or their partner's name contains the query. */
export function doorGuestMatches(g: Pick<DoorGuest, 'name' | 'partnerName'>, q: string): boolean {
  const needle = foldDoorQuery(q)
  if (!needle) return true
  return foldDoorQuery(`${g.name} ${g.partnerName ?? ''}`).includes(needle)
}
