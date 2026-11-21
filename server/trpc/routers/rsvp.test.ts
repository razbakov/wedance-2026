/**
 * rsvp router (RAZ-718) — the event RSVP as the organiser's poll: a signed-out
 * tap counts at once (unconfirmed), signing in through the magic link folds it
 * into the dancer's confirmed answer, pairing, "Next time", and the organiser's
 * summary in the same buckets.
 *
 * Postgres only (see server/test-setup.ts); fixtures are removed in afterAll.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { and, eq, inArray } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { appRouter } from '../index'
import { signupsOf } from '../../utils/eventCancel'

const DATABASE_URL = process.env.DATABASE_URL
const db: any = DATABASE_URL ? drizzle(neon(DATABASE_URL), { schema }) : null

const RUN = Math.random().toString(36).slice(2, 8)
const ids: Record<string, string> = {}
const caller = (dancerId: string | null, isAdmin = false) => appRouter.createCaller({ db, dancerId, isAdmin } as any)
const GUEST = crypto.randomUUID()
const OTHER_GUEST = crypto.randomUUID()

describe.skipIf(!DATABASE_URL)('rsvp router', () => {
  beforeAll(async () => {
    for (const key of ['ana', 'ben', 'cat']) {
      const [d] = await db.insert(schema.dancers).values({ email: `${key}-${RUN}@test.wedance.local`, name: `${key} ${RUN}` }).returning({ id: schema.dancers.id })
      ids[key] = d.id
    }
    const [org] = await db.insert(schema.profiles).values({ username: `org-${RUN}`, name: `Org ${RUN}`, type: 'organizer' }).returning({ id: schema.profiles.id })
    ids.org = org.id
    // Someone on WeDance gets these bookings (RAZ-1016). Without a team the sign-up is refused.
    await db.insert(schema.profileMembers).values({ profileId: ids.org, dancerId: ids.ana, role: 'owner' })
    const start = new Date(Date.now() + 2 * 86400_000)
    const [ev] = await db.insert(schema.events).values({
      name: `Salsa From Zero ${RUN}`, type: 'Course', styles: ['Salsa', 'Casino'], startDate: start, timezone: 'Europe/Berlin',
      published: true, archived: false, organizerUsername: `org-${RUN}`,
    }).returning({ id: schema.events.id })
    ids.event = ev.id
    const [solo] = await db.insert(schema.events).values({
      name: `Reggaeton ${RUN}`, type: 'Class', styles: ['Reggaeton'], startDate: start, timezone: 'Europe/Berlin',
      published: true, archived: false, organizerUsername: `org-${RUN}`,
    }).returning({ id: schema.events.id })
    ids.solo = solo.id
  })

  afterAll(async () => {
    if (!db) return
    const dancerIds = [ids.ana, ids.ben, ids.cat].filter(Boolean)
    await db.delete(schema.festivalWaves).where(inArray(schema.festivalWaves.dancerId, dancerIds))
    await db.delete(schema.follows).where(inArray(schema.follows.dancerId, dancerIds))
    await db.delete(schema.planItems).where(inArray(schema.planItems.dancerId, dancerIds))
    await db.delete(schema.events).where(inArray(schema.events.id, [ids.event, ids.solo]))
    await db.delete(schema.profiles).where(eq(schema.profiles.id, ids.org))
    await db.delete(schema.dancers).where(inArray(schema.dancers.id, dancerIds))
  })

  it('shows the counts before anyone answers, with the partner-dance options', async () => {
    const p = await caller(null).rsvp.poll({ event: ids.event, guestToken: GUEST })
    expect(p.partner).toBe(true)
    expect(p.coming).toBe(0)
    expect(p.mine).toBeNull()
    expect((await caller(null).rsvp.poll({ event: ids.solo })).partner).toBe(false)
  })

  it('counts a signed-out "I need a leader" at once, unconfirmed', async () => {
    const p = await caller(null).rsvp.answer({ event: ids.event, answer: 'needLeader', guestToken: GUEST })
    expect(p.counts.needLeader).toBe(1)
    expect(p.unconfirmed).toBe(1)
    expect(p.coming).toBe(1)
    expect(p.mine).toEqual({ answer: 'needLeader', confirmed: false, signup: { name: null, phone: null, partnerName: null, pass: null, pay: null, keepInTouch: false } })
    // The organiser sees it straight away, in the same buckets.
    const s = await caller(ids.ana, true).rsvp.summary({ eventId: ids.event })
    expect(s.counts.needLeader).toBe(1)
    expect(s.line).toBe('1 coming · 1 unconfirmed · 0 with a partner · 1 need a leader · 0 need a follower · 0 next time → 1 leader short')
  })

  it('needs a guest token when signed out', async () => {
    await expect(caller(null).rsvp.answer({ event: ids.event, answer: 'yes' })).rejects.toThrow(/guest token/i)
  })

  it('the magic link folds the guest answer into the dancer’s, confirmed, without double counting', async () => {
    const p = await caller(ids.ana).rsvp.answer({ event: ids.event, answer: 'needLeader', guestToken: GUEST })
    expect(p.mine).toEqual({ answer: 'needLeader', confirmed: true, signup: { name: null, phone: null, partnerName: null, pass: null, pay: null, keepInTouch: false } })
    expect(p.counts.needLeader).toBe(1)
    expect(p.unconfirmed).toBe(0)
    const rows = await db.select().from(schema.eventRsvps).where(eq(schema.eventRsvps.eventId, ids.event))
    expect(rows).toHaveLength(1)
    expect(rows[0].dancerId).toBe(ids.ana)
    // A yes answer puts the event on the dancer's plan.
    const plan = await db.select().from(schema.planItems).where(and(eq(schema.planItems.dancerId, ids.ana), eq(schema.planItems.itemId, ids.event)))
    expect(plan).toHaveLength(1)
  })

  it('pairs a confirmed "I need a leader" with confirmed "I need a follower"s, and waves', async () => {
    await caller(ids.ben).rsvp.answer({ event: ids.event, answer: 'needFollower' })
    // An unconfirmed answer is never shown as a person.
    await caller(null).rsvp.answer({ event: ids.event, answer: 'needFollower', guestToken: OTHER_GUEST })
    const p = await caller(ids.ana).rsvp.poll({ event: ids.event })
    expect(p.matches.map(m => m.dancerId)).toEqual([ids.ben])
    expect(p.matches[0].name).toBe('ben')
    expect(p.matches[0].waved).toBe(false)
    await caller(ids.ana).wave.send({ festivalSlug: ids.event, targetDancerId: ids.ben })
    expect((await caller(ids.ana).rsvp.poll({ event: ids.event })).matches[0].waved).toBe(true)
    // And back the other way.
    expect((await caller(ids.ben).rsvp.poll({ event: ids.event })).matches.map(m => m.dancerId)).toEqual([ids.ana])
  })

  it('"Next time" takes the event off the plan and follows the organiser', async () => {
    await caller(ids.cat).rsvp.answer({ event: ids.event, answer: 'partner' })
    const p = await caller(ids.cat).rsvp.answer({ event: ids.event, answer: 'next' })
    expect(p.mine).toEqual({ answer: 'next', confirmed: true, signup: { name: null, phone: null, partnerName: null, pass: null, pay: null, keepInTouch: false } })
    const plan = await db.select().from(schema.planItems).where(and(eq(schema.planItems.dancerId, ids.cat), eq(schema.planItems.itemId, ids.event)))
    expect(plan).toHaveLength(0)
    const f = await db.select().from(schema.follows).where(and(eq(schema.follows.dancerId, ids.cat), eq(schema.follows.profileId, ids.org)))
    expect(f).toHaveLength(1)
  })

  it('shows a signed-in dancer who answered what, like a WhatsApp poll (RAZ-974)', async () => {
    // Now: ana needs a leader, ben needs a follower (both confirmed), cat said next time, one guest unconfirmed.
    const p = await caller(ids.ben).rsvp.poll({ event: ids.event })
    const byId = Object.fromEntries(p.voters.map(v => [v.dancerId, v]))
    expect(Object.keys(byId).sort()).toEqual([ids.ana, ids.ben].sort())
    expect(byId[ids.ana]).toMatchObject({ name: 'ana', answer: 'needLeader', me: false })
    expect(byId[ids.ben]).toMatchObject({ answer: 'needFollower', me: true })
    expect(JSON.stringify(p.voters)).not.toContain('@test.wedance.local')
    // Signed out: counts only, no people.
    expect((await caller(null).rsvp.poll({ event: ids.event, guestToken: GUEST })).voters).toEqual([])
    // A private profile stays a number to others, but sees itself.
    await db.update(schema.dancers).set({ profilePublic: false }).where(eq(schema.dancers.id, ids.ana))
    try {
      expect((await caller(ids.ben).rsvp.poll({ event: ids.event })).voters.map(v => v.dancerId)).toEqual([ids.ben])
      expect((await caller(ids.ana).rsvp.poll({ event: ids.event })).voters.find(v => v.me)?.dancerId).toBe(ids.ana)
    } finally {
      await db.update(schema.dancers).set({ profilePublic: true }).where(eq(schema.dancers.id, ids.ana))
    }
  })

  it('lists the people behind the counts for the organiser: names, answers, the signed-out guest without one', async () => {
    const people = await caller(ids.ana, true).rsvp.people({ eventId: ids.event })
    const byId = Object.fromEntries(people.filter(p => p.dancerId).map(p => [p.dancerId, p]))
    expect(byId[ids.ana]).toMatchObject({ name: `ana ${RUN}`, answer: 'needLeader', confirmed: true })
    expect(byId[ids.ben]).toMatchObject({ answer: 'needFollower', confirmed: true })
    expect(byId[ids.cat]).toMatchObject({ answer: 'next' })
    const guests = people.filter(p => !p.dancerId)
    expect(guests).toEqual([expect.objectContaining({ name: null, answer: 'needFollower', confirmed: false })])
    expect(JSON.stringify(people)).not.toContain('@test.wedance.local')
  })

  it('lets a confirmed dancer who is coming share their contact with the organiser page, and stop', async () => {
    const before = await caller(ids.ana).rsvp.poll({ event: ids.event })
    expect(before.contact).toEqual({ page: `Org ${RUN}`, shared: false, phone: null })

    const on = await caller(ids.ana).rsvp.shareContact({ event: ids.event, share: true, phone: '+49 151 000' })
    expect(on.contact).toEqual({ page: `Org ${RUN}`, shared: true, phone: '+49 151 000' })
    const rows = await db.select().from(schema.profileContacts).where(eq(schema.profileContacts.profileId, ids.org))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ dancerId: ids.ana, email: `ana-${RUN}@test.wedance.local`, phone: '+49 151 000', status: 'subscribed', source: { from: 'rsvp', event: ids.event } })

    const off = await caller(ids.ana).rsvp.shareContact({ event: ids.event, share: false })
    expect(off.contact?.shared).toBe(false)
    const [row] = await db.select().from(schema.profileContacts).where(eq(schema.profileContacts.id, rows[0].id))
    expect(row.status).toBe('unsubscribed')
  })

  it('an imported contact who shares keeps its row and source, and becomes mailable', async () => {
    await db.insert(schema.profileContacts).values({ profileId: ids.org, email: `BEN-${RUN}@test.wedance.local`, source: { from: 'hubspot', hubspot_origin: 'import' } })
    await caller(ids.ben).rsvp.shareContact({ event: ids.event, share: true })
    const rows = await db.select().from(schema.profileContacts).where(and(eq(schema.profileContacts.profileId, ids.org), eq(schema.profileContacts.dancerId, ids.ben)))
    expect(rows).toHaveLength(1)
    expect(rows[0].source).toMatchObject({ from: 'hubspot', hubspot_origin: 'import', opted_in: 'rsvp', opted_in_event: ids.event })
  })

  it('only someone coming can share', async () => {
    await expect(caller(ids.cat).rsvp.shareContact({ event: ids.event, share: true })).rejects.toThrow(/answer the poll/i)
  })

  it('Contacts can filter by the event: who is coming, and how many signed up in all', async () => {
    const o = await caller(ids.ana, true).businessSite.contactsOverview({ username: `org-${RUN}` })
    const ev = o.events.find(e => e.id === ids.event)
    expect(ev?.coming).toBeGreaterThanOrEqual(2)
    const ben = o.contacts.find(c => c.hasAccount && c.email.toLowerCase() === `ben-${RUN}@test.wedance.local`)
    expect(ben?.activity.events[ids.event]).toBe('needFollower')
    expect(ben?.emailBlock).toBeNull()
  })

  it('drops an unconfirmed answer out of the count after 48 hours', async () => {
    const before = await caller(null).rsvp.poll({ event: ids.event })
    await db.update(schema.eventRsvps).set({ updatedAt: new Date(Date.now() - 49 * 3600_000) })
      .where(and(eq(schema.eventRsvps.eventId, ids.event), eq(schema.eventRsvps.guestToken, OTHER_GUEST)))
    const after = await caller(null).rsvp.poll({ event: ids.event })
    expect(after.counts.needFollower).toBe(before.counts.needFollower - 1)
    expect(after.unconfirmed).toBe(0)
  })

  it('a guest who left an email for the confirm link is told when the event is cancelled (RAZ-948)', async () => {
    const guest = crypto.randomUUID()
    const nextGuest = crypto.randomUUID()
    const email = `guest-${RUN}@test.wedance.local`
    await caller(null).rsvp.answer({ event: ids.solo, answer: 'yes', guestToken: guest })
    await caller(null).auth.requestMagicLink({ email, redirect: '/events/x', do: 'yes', guest })
    // "Next time" with an email: not coming, not told.
    await caller(null).rsvp.answer({ event: ids.solo, answer: 'next', guestToken: nextGuest })
    await caller(null).auth.requestMagicLink({ email: `next-${RUN}@test.wedance.local`, guest: nextGuest })
    // A later answer from the same browser keeps the email.
    await caller(null).rsvp.answer({ event: ids.event, answer: 'yes', guestToken: guest })
    try {
      const [ev] = await db.select().from(schema.events).where(eq(schema.events.id, ids.solo))
      expect((await signupsOf(db, ev)).map(p => p.email)).toEqual([email])
      const [later] = await db.select({ e: schema.eventRsvps.guestEmail }).from(schema.eventRsvps)
        .where(and(eq(schema.eventRsvps.eventId, ids.event), eq(schema.eventRsvps.guestToken, guest)))
      expect(later.e).toBe(email)
    } finally {
      await db.delete(schema.eventRsvps).where(inArray(schema.eventRsvps.guestToken, [guest, nextGuest]))
      await db.delete(schema.dancers).where(inArray(schema.dancers.email, [email, `next-${RUN}@test.wedance.local`]))
    }
  })

  it('keeps the organiser view to the event’s managers', async () => {
    await expect(caller(ids.ben).rsvp.summary({ eventId: ids.event })).rejects.toThrow(/manage/i)
    await expect(caller(ids.ben).rsvp.people({ eventId: ids.event })).rejects.toThrow(/manage/i)
  })
})

// RAZ-995 — signing up: how you come + pass + pay + contact, signed out then confirmed by the magic link.
describe.skipIf(!DATABASE_URL)('rsvp.signUp', () => {
  const S: Record<string, string> = {}
  const GUEST_S = crypto.randomUUID()
  const email = `maria-${RUN}@test.wedance.local`

  beforeAll(async () => {
    // A fresh magic-link account: its name is still the email's first part.
    const [d] = await db.insert(schema.dancers).values({ email, name: email.split('@')[0] }).returning({ id: schema.dancers.id })
    S.maria = d.id
    const [org] = await db.insert(schema.profiles).values({ username: `signup-org-${RUN}`, name: `Signup Org ${RUN}`, type: 'organizer' }).returning({ id: schema.profiles.id })
    S.org = org.id
    await db.insert(schema.profileMembers).values({ profileId: S.org, dancerId: S.maria, role: 'owner' })
    const start = new Date(Date.now() + 3 * 86400_000)
    const [ev] = await db.insert(schema.events).values({
      name: `Casino Partnerwork ${RUN}`, type: 'class', styles: ['Casino'], startDate: start, timezone: 'Europe/Berlin',
      published: true, archived: false, organizerUsername: `signup-org-${RUN}`,
      festival: { key: `signup-${RUN}`, payAtDoor: true, passes: [{ name: 'This class', price: 10, days: [], couplePrice: 18 }] },
    }).returning({ id: schema.events.id })
    S.event = ev.id
    const [online] = await db.insert(schema.events).values({
      name: `Casino Course ${RUN}`, type: 'course', styles: ['Casino'], startDate: start, timezone: 'Europe/Berlin',
      published: true, archived: false, organizerUsername: `signup-org-${RUN}`,
      festival: { key: `signup-online-${RUN}`, passes: [{ name: 'Whole course', price: 60, days: [] }, { name: 'One class', price: 18, days: [] }] },
    }).returning({ id: schema.events.id })
    S.online = online.id
  })

  afterAll(async () => {
    if (!db) return
    await db.delete(schema.profileContacts).where(eq(schema.profileContacts.profileId, S.org))
    await db.delete(schema.planItems).where(eq(schema.planItems.dancerId, S.maria))
    await db.delete(schema.events).where(inArray(schema.events.id, [S.event, S.online]))
    await db.delete(schema.profiles).where(eq(schema.profiles.id, S.org))
    await db.delete(schema.dancers).where(eq(schema.dancers.id, S.maria))
  })

  it('refuses a missing phone for a class, an unknown pass, and the door when payment is online only', async () => {
    const guest = caller(null).rsvp
    await expect(guest.signUp({ event: S.event, answer: 'partner', guestToken: GUEST_S, name: 'Maria Lopez', pay: 'door', phone: '' })).rejects.toThrow(/phone/i)
    await expect(guest.signUp({ event: S.online, answer: 'partner', guestToken: GUEST_S, name: 'Maria Lopez', pass: 'Nope', pay: 'now', phone: '+49 171 1234567' })).rejects.toThrow(/pass/i)
    await expect(guest.signUp({ event: S.online, answer: 'partner', guestToken: GUEST_S, name: 'Maria Lopez', pass: 'One class', pay: 'door', phone: '+49 171 1234567' })).rejects.toThrow(/online/i)
    await expect(guest.signUp({ event: S.event, answer: 'partner', guestToken: GUEST_S, name: 'Maria', pay: 'door', phone: '+49 171 1234567' })).rejects.toThrow(/first and last name/i)
  })

  it('saves a signed-out sign-up unconfirmed, with the only pass picked for them', async () => {
    const p = await caller(null).rsvp.signUp({
      event: S.event, answer: 'partner', guestToken: GUEST_S, name: 'Maria Lopez', pay: 'door', phone: '+49 171 1234567', partnerName: 'Juan', keepInTouch: false,
      cameFrom: { utm_source: 'montuno.club', utm_medium: 'schedule', referrer: 'https://montuno.club/' },
    })
    expect(p.mine).toEqual({
      answer: 'partner', confirmed: false,
      signup: { name: 'Maria Lopez', phone: '+49 171 1234567', partnerName: 'Juan', pass: 'This class', pay: 'door', keepInTouch: false },
    })
    expect(p.me).toBeNull()
  })

  it('the magic link folds it into the account: phone and real name saved, the organiser gets a contact it may not email', async () => {
    const p = await caller(S.maria).rsvp.answer({ event: S.event, answer: 'partner', guestToken: GUEST_S })
    expect(p.mine).toMatchObject({ answer: 'partner', confirmed: true, signup: { phone: '+49 171 1234567', partnerName: 'Juan', pass: 'This class', pay: 'door' } })
    expect(p.me).toMatchObject({ name: 'Maria Lopez', email, phone: '+49 171 1234567' })
    const guestRows = await db.select().from(schema.eventRsvps).where(eq(schema.eventRsvps.guestToken, GUEST_S))
    expect(guestRows).toHaveLength(0)
    const [contact] = await db.select().from(schema.profileContacts).where(eq(schema.profileContacts.profileId, S.org))
    expect(contact).toMatchObject({ email, name: 'Maria Lopez', phone: '+49 171 1234567', status: 'subscribed' })
    // Where the sign-up came from (RAZ-1074) survives the magic link and lands on the contact.
    expect(contact.source).toMatchObject({ from: 'signup', event: S.event, utm_source: 'montuno.club', utm_medium: 'schedule', referrer: 'https://montuno.club/' })
    expect(contact.source.opted_in).toBeUndefined()
  })

  it('signed in, "tell me about next events" opts the contact in; a chosen name is never replaced', async () => {
    await db.update(schema.dancers).set({ name: 'Maria L.' }).where(eq(schema.dancers.id, S.maria))
    const p = await caller(S.maria).rsvp.signUp({ event: S.online, answer: 'needLeader', pass: 'Whole course', pay: 'now', phone: '+49 171 7654321', keepInTouch: true, cameFrom: { utm_source: 'instagram' } })
    expect(p.mine).toMatchObject({ answer: 'needLeader', confirmed: true, signup: { pass: 'Whole course', pay: 'now', keepInTouch: true } })
    expect(p.me).toMatchObject({ name: 'Maria L.', phone: '+49 171 7654321' })
    const [contact] = await db.select().from(schema.profileContacts).where(eq(schema.profileContacts.profileId, S.org))
    expect(contact.source).toMatchObject({ opted_in: 'signup', opted_in_event: S.online, utm_source: 'montuno.club' })
    expect(contact.phone).toBe('+49 171 7654321')
  })
})

// RAZ-1016 — an event whose page has no team takes no sign-ups. The refusal says where to book.
describe.skipIf(!DATABASE_URL)('rsvp refuses an event nobody manages', () => {
  const U: Record<string, string> = {}
  const LINK = 'https://www.megano-tanzschule.de/kurs'
  const guest = crypto.randomUUID()

  beforeAll(async () => {
    const [dancer] = await db.insert(schema.dancers).values({ email: `unmanaged-${RUN}@test.wedance.local`, name: `Unmanaged ${RUN}` }).returning({ id: schema.dancers.id })
    U.dancer = dancer.id
    const [org] = await db.insert(schema.profiles).values({ username: `unmanaged-org-${RUN}`, name: `Megano ${RUN}`, type: 'organizer' }).returning({ id: schema.profiles.id })
    U.org = org.id
    const [host] = await db.insert(schema.profiles).values({ username: `unmanaged-host-${RUN}`, name: `Host ${RUN}`, type: 'organizer' }).returning({ id: schema.profiles.id })
    U.host = host.id
    const [managedHost] = await db.insert(schema.profiles).values({ username: `managed-host-${RUN}`, name: `Managed Host ${RUN}`, type: 'organizer' }).returning({ id: schema.profiles.id })
    U.managedHost = managedHost.id
    await db.insert(schema.profileMembers).values({ profileId: U.managedHost, dancerId: U.dancer, role: 'owner' })
    const start = new Date(Date.now() + 4 * 86400_000)
    const base = { type: 'Party', styles: ['Salsa'], startDate: start, timezone: 'Europe/Berlin', published: true, archived: false }
    const [imported] = await db.insert(schema.events).values({
      ...base, name: `Salsa Cubana ${RUN}`, organizerUsername: `unmanaged-org-${RUN}`, link: LINK,
    }).returning({ id: schema.events.id })
    U.imported = imported.id
    const [nolink] = await db.insert(schema.events).values({
      ...base, name: `No Link ${RUN}`, organizerUsername: `unmanaged-org-${RUN}`,
    }).returning({ id: schema.events.id })
    U.nolink = nolink.id
    // Host wins over the organiser: a team on the organiser does not make a team-less host bookable.
    const [hostBlocks] = await db.insert(schema.events).values({
      ...base, name: `Host Blocks ${RUN}`, hostProfileId: U.host, organizerUsername: `managed-host-${RUN}`, link: LINK,
    }).returning({ id: schema.events.id })
    U.hostBlocks = hostBlocks.id
    const [hostOk] = await db.insert(schema.events).values({
      ...base, name: `Host Ok ${RUN}`, hostProfileId: U.managedHost,
    }).returning({ id: schema.events.id })
    U.hostOk = hostOk.id
  })

  afterAll(async () => {
    if (!db) return
    const eventIds = [U.imported, U.nolink, U.hostBlocks, U.hostOk].filter(Boolean)
    await db.delete(schema.eventRsvps).where(inArray(schema.eventRsvps.eventId, eventIds))
    await db.delete(schema.planItems).where(eq(schema.planItems.dancerId, U.dancer))
    await db.delete(schema.events).where(inArray(schema.events.id, eventIds))
    await db.delete(schema.profiles).where(inArray(schema.profiles.id, [U.org, U.host, U.managedHost]))
    await db.delete(schema.dancers).where(eq(schema.dancers.id, U.dancer))
  })

  async function refused(run: Promise<unknown>, link: string | null) {
    const err = await run.then(() => null, (e: unknown) => e) as { code?: string, message?: string, cause?: { name?: string, link?: string | null } }
    expect(err?.code).toBe('PRECONDITION_FAILED')
    expect(err?.cause).toMatchObject({ name: 'BookElsewhere', link })
    if (link) expect(err?.message).toBe('Nobody on WeDance takes bookings for this event. Book on megano-tanzschule.de.')
    else expect(err?.message).toBe('Nobody on WeDance takes bookings for this event. Ask the organiser directly.')
  }

  it('refuses a sign-up and a poll answer, and writes no row', async () => {
    expect((await caller(null).events.get({ id: U.imported })).bookable).toBe(false)
    await refused(caller(null).rsvp.signUp({
      event: U.imported, answer: 'yes', guestToken: guest, name: 'Mina Guest', phone: '+49 171 0000000',
    }), LINK)
    await refused(caller(null).rsvp.answer({ event: U.imported, answer: 'yes', guestToken: guest }), LINK)
    await refused(caller(U.dancer).rsvp.answer({ event: U.imported, answer: 'yes' }), LINK)
    await refused(caller(U.dancer).rsvp.signUp({ event: U.imported, answer: 'yes', phone: '' }), LINK)
    expect(await db.select().from(schema.eventRsvps).where(eq(schema.eventRsvps.eventId, U.imported))).toEqual([])
  })

  it('says to ask the organiser when the event has no link', async () => {
    await refused(caller(U.dancer).rsvp.answer({ event: U.nolink, answer: 'needLeader' }), null)
    expect(await db.select().from(schema.eventRsvps).where(eq(schema.eventRsvps.eventId, U.nolink))).toEqual([])
  })

  it('follows the host page: a team-less host is refused, a host with a team is booked', async () => {
    await refused(caller(U.dancer).rsvp.answer({ event: U.hostBlocks, answer: 'yes' }), LINK)
    expect(await db.select().from(schema.eventRsvps).where(eq(schema.eventRsvps.eventId, U.hostBlocks))).toEqual([])
    expect((await caller(null).events.get({ id: U.hostOk })).bookable).toBe(true)
    const p = await caller(U.dancer).rsvp.answer({ event: U.hostOk, answer: 'yes' })
    expect(p.mine).toMatchObject({ answer: 'yes', confirmed: true })
  })
})
