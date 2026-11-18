/**
 * Who signed up for an event, as its organiser sees it: one row per person,
 * merged from the RSVP poll, Going! (plan items) and attendances / tickets.
 * The counts on the "Who's coming" card stay the poll's; this list puts names
 * and faces to them and adds the people who only put the event on their plan or
 * bought a ticket.
 *
 * Organisers see everyone who signed up for their event, whatever the dancer's
 * public "who's going" visibility (that only governs other dancers). Never an
 * email or phone: unclaimed ticket stubs and signed-out answers show without a name.
 */
import { RSVP_ANSWERS, type RsvpAnswer } from './rsvp'

export interface SignupPerson {
  /** Stable key for lists: the dancer id, else `guest:<n>` / `ticket:<n>`. */
  key: string
  dancerId: string | null
  name: string | null
  photo: string | null
  username: string | null
  /** The poll answer, or null when they only planned it / hold a ticket. */
  answer: RsvpAnswer | null
  /** Signed in (or confirmed by email). Signed-out poll answers are not. */
  confirmed: boolean
  ticket: boolean
  checkedIn: boolean
}

export interface SignupRowsIn {
  polls: readonly { dancerId: string | null; answer: string; confirmed: boolean; checkedIn?: boolean }[]
  attendances: readonly { dancerId: string | null; status: string; checkedIn: boolean }[]
  plans: readonly { dancerId: string }[]
  people: readonly { id: string; name: string | null; photo: string | null; username: string | null }[]
}

const ORDER = new Map<RsvpAnswer | null, number>([...RSVP_ANSWERS.map((a, i) => [a, i] as const), [null, RSVP_ANSWERS.length]])

export function mergeSignups(rows: SignupRowsIn): SignupPerson[] {
  const byDancer = new Map<string, SignupPerson>()
  const anon: SignupPerson[] = []
  const person = (id: string) => rows.people.find(p => p.id === id)

  const ensure = (dancerId: string): SignupPerson => {
    let row = byDancer.get(dancerId)
    if (!row) {
      const p = person(dancerId)
      row = {
        key: dancerId, dancerId,
        name: p?.name?.trim() || null, photo: p?.photo ?? null, username: p?.username ?? null,
        answer: null, confirmed: true, ticket: false, checkedIn: false,
      }
      byDancer.set(dancerId, row)
    }
    return row
  }

  for (const r of rows.polls) {
    const answer = (RSVP_ANSWERS as readonly string[]).includes(r.answer) ? r.answer as RsvpAnswer : null
    if (!answer) continue
    if (r.dancerId) {
      const row = ensure(r.dancerId)
      row.answer = answer
      row.confirmed = r.confirmed
      row.checkedIn ||= !!r.checkedIn
    } else {
      anon.push({ key: `guest:${anon.length}`, dancerId: null, name: null, photo: null, username: null, answer, confirmed: false, ticket: false, checkedIn: !!r.checkedIn })
    }
  }

  for (const a of rows.attendances) {
    if (a.status !== 'going' && a.status !== 'ticket_holder') continue
    const ticket = a.status === 'ticket_holder'
    if (a.dancerId) {
      const row = ensure(a.dancerId)
      row.ticket ||= ticket
      row.checkedIn ||= a.checkedIn
    } else if (ticket) {
      anon.push({ key: `ticket:${anon.length}`, dancerId: null, name: null, photo: null, username: null, answer: null, confirmed: false, ticket: true, checkedIn: a.checkedIn })
    }
  }

  for (const p of rows.plans) ensure(p.dancerId)

  // "Next time" answers are listed too, under their own chip.
  const all = [...byDancer.values(), ...anon]
  return all.sort((a, b) =>
    (ORDER.get(a.answer) ?? 99) - (ORDER.get(b.answer) ?? 99)
    || Number(b.confirmed) - Number(a.confirmed)
    || (a.name === null ? 1 : 0) - (b.name === null ? 1 : 0)
    || (a.name ?? '').localeCompare(b.name ?? ''))
}

/** How a row is labelled when there's no name to show. */
export function signupDisplayName(p: Pick<SignupPerson, 'name' | 'dancerId' | 'ticket'>): string {
  if (p.name) return p.name
  if (!p.dancerId && p.ticket) return 'Ticket buyer'
  if (!p.dancerId) return 'Guest'
  return 'Dancer'
}
