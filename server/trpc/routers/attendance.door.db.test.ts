/**
 * Door check-in (RAZ-928): the list an organiser sees on their phone, and
 * checking in an RSVP, a Going!, a ticket, a signed-out guest and a festival pass.
 * Postgres only (server/test-setup.ts).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { and, eq, inArray } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { appRouter } from '../index'

const DATABASE_URL = process.env.DATABASE_URL
const db: any = DATABASE_URL ? drizzle(neon(DATABASE_URL), { schema }) : null

const RUN = Math.random().toString(36).slice(2, 8)
const ids: Record<string, string> = {}
const caller = (dancerId: string | null, isAdmin = false) => appRouter.createCaller({ db, dancerId, isAdmin } as any)

describe.skipIf(!DATABASE_URL)('door check-in', () => {
  beforeAll(async () => {
    for (const key of ['host', 'ana', 'ben', 'tia', 'fan', 'stranger']) {
      const [d] = await db.insert(schema.dancers).values({ email: `${key}-${RUN}@test.wedance.local`, name: `${key} ${RUN}` }).returning({ id: schema.dancers.id })
      ids[key] = d.id
    }
    const [org] = await db.insert(schema.profiles).values({ username: `door-${RUN}`, name: `Door ${RUN}`, type: 'organizer', claimed: true }).returning({ id: schema.profiles.id })
    ids.org = org.id
    await db.insert(schema.profileMembers).values({ profileId: ids.org, dancerId: ids.host, role: 'owner' })
    const start = new Date(Date.now() + 2 * 86400_000)
    const festKey = `door-fest-${RUN}`
    const [ev] = await db.insert(schema.events).values({
      name: `Thursday Social ${RUN}`, type: 'Party', styles: ['Salsa'], startDate: start, timezone: 'Europe/Berlin',
      published: true, archived: false, organizerUsername: `door-${RUN}`, hostProfileId: ids.org,
      isFestival: true, festival: { key: festKey },
    }).returning({ id: schema.events.id })
    ids.event = ev.id
    const [fest] = await db.insert(schema.festivals).values({ slug: festKey, name: `Fest ${RUN}` }).returning({ id: schema.festivals.id })
    ids.fest = fest.id

    await caller(ids.ana).rsvp.answer({ event: ids.event, answer: 'needLeader' })
    await db.insert(schema.planItems).values({ dancerId: ids.ben, itemType: 'event', itemId: ids.event })
    const [ticket] = await db.insert(schema.attendances).values({
      eventId: ids.event, dancerId: ids.tia, status: 'ticket_holder', source: 'stripe', visibility: 'hidden',
    }).returning({ id: schema.attendances.id })
    ids.ticket = ticket.id
    const [stub] = await db.insert(schema.attendances).values({
      eventId: ids.event, buyerEmail: `stub-${RUN}@test.wedance.local`, status: 'ticket_holder', source: 'stripe', visibility: 'hidden',
    }).returning({ id: schema.attendances.id })
    ids.stub = stub.id
    const guest = crypto.randomUUID()
    ids.guestToken = guest
    await db.insert(schema.eventRsvps).values({ eventId: ids.event, guestToken: guest, answer: 'yes', name: 'Mina Guest', confirmedAt: null })
    await db.insert(schema.eventRsvps).values({
      eventId: ids.event, dancerId: ids.stranger, answer: 'next', confirmedAt: new Date(),
    })
    await db.insert(schema.festivalSignups).values({
      festivalId: ids.fest, dancerId: ids.fan, paidAmount: 12000, verifiedTicketHolder: true, verifiedAt: new Date(),
    })
  })

  afterAll(async () => {
    if (!db || !ids.event) return
    const dancerIds = ['host', 'ana', 'ben', 'tia', 'fan', 'stranger', 'mina'].map(k => ids[k]).filter(Boolean)
    await db.delete(schema.planItems).where(inArray(schema.planItems.dancerId, dancerIds))
    await db.delete(schema.festivalSignups).where(eq(schema.festivalSignups.festivalId, ids.fest))
    await db.delete(schema.festivals).where(eq(schema.festivals.id, ids.fest))
    await db.delete(schema.events).where(eq(schema.events.id, ids.event))
    await db.delete(schema.profiles).where(eq(schema.profiles.id, ids.org))
    await db.delete(schema.dancers).where(inArray(schema.dancers.id, dancerIds))
  })

  it('lists RSVP, Going!, ticket, guest name and festival pass, and leaves “next time” off', async () => {
    const door = await caller(ids.host).attendance.door({ eventId: ids.event })
    expect(door.eventName).toContain(RUN)
    expect(JSON.stringify(door)).not.toContain('@test.wedance.local')
    const by = Object.fromEntries(door.guests.map(g => [g.dancerId ?? g.name, g]))
    expect(by[ids.ana]).toMatchObject({ via: 'rsvp', answer: 'needLeader', checkedIn: false, name: `ana ${RUN}` })
    expect(by[ids.ben]).toMatchObject({ via: 'going', dancerId: ids.ben, attendanceId: null })
    expect(by[ids.tia]).toMatchObject({ via: 'ticket', attendanceId: ids.ticket })
    expect(by[ids.fan]).toMatchObject({ via: 'ticket', dancerId: ids.fan, attendanceId: null })
    expect(by['Mina Guest']).toMatchObject({ via: 'rsvp', rsvpId: expect.any(String), dancerId: null, confirmed: false })
    expect(by['Ticket']).toMatchObject({ attendanceId: ids.stub, via: 'ticket' })
    expect(door.guests.some(g => g.dancerId === ids.stranger)).toBe(false)
    expect(door.here).toBe(0)
    expect(door.total).toBe(door.guests.length)
  })

  it('checks each kind of guest in once, shows the count on Who’s coming, and undo clears only the tick', async () => {
    const host = caller(ids.host)
    const door = await host.attendance.door({ eventId: ids.event })
    const mina = door.guests.find(g => g.name === 'Mina Guest')!
    const ana = door.guests.find(g => g.dancerId === ids.ana)!
    const ben = door.guests.find(g => g.dancerId === ids.ben)!
    const fan = door.guests.find(g => g.dancerId === ids.fan)!

    const first = await host.attendance.checkIn({ eventId: ids.event, attendanceId: ids.ticket })
    const again = await host.attendance.checkIn({ eventId: ids.event, attendanceId: ids.ticket })
    expect(new Date(again.checkedInAt!).getTime()).toBe(new Date(first.checkedInAt!).getTime())
    expect(again.checkedIn).toBe(true)

    await host.attendance.checkIn({ eventId: ids.event, dancerId: ids.ben })
    await host.attendance.checkIn({ eventId: ids.event, dancerId: ids.ana })
    await host.attendance.checkIn({ eventId: ids.event, rsvpId: mina.rsvpId! })
    await host.attendance.checkIn({ eventId: ids.event, dancerId: ids.fan })

    const [benRow] = await db.select().from(schema.attendances).where(and(eq(schema.attendances.eventId, ids.event), eq(schema.attendances.dancerId, ids.ben)))
    expect(benRow).toMatchObject({ status: 'going', source: 'click' })
    expect(benRow.checkedInAt).toBeTruthy()

    const [fanRow] = await db.select().from(schema.attendances).where(and(eq(schema.attendances.eventId, ids.event), eq(schema.attendances.dancerId, ids.fan)))
    expect(fanRow.status).toBe('ticket_holder')
    expect(fanRow.checkedInAt).toBeTruthy()

    const people = await host.rsvp.people({ eventId: ids.event })
    expect(people.find(p => p.dancerId === ids.ana)?.checkedIn).toBe(true)
    expect(people.find(p => p.dancerId === ids.ben)?.checkedIn).toBe(true)
    expect(people.find(p => p.dancerId === ids.tia)?.checkedIn).toBe(true)
    expect(people.find(p => p.dancerId === ids.fan)?.checkedIn).toBe(true)
    expect(people.find(p => !p.dancerId && p.answer === 'yes')?.checkedIn).toBe(true)
    expect(people.filter(p => p.checkedIn).length).toBeGreaterThanOrEqual(5)

    const undone = await host.attendance.checkIn({ eventId: ids.event, rsvpId: mina.rsvpId!, undo: true })
    expect(undone.checkedIn).toBe(false)
    const after = await host.rsvp.people({ eventId: ids.event })
    expect(after.find(p => !p.dancerId && p.answer === 'yes')?.checkedIn).toBe(false)
    // Undo does not drop them off the list or remove a ticket.
    expect((await host.attendance.door({ eventId: ids.event })).guests.some(g => g.name === 'Mina Guest')).toBe(true)
    const [tia] = await db.select({ status: schema.attendances.status, checkedInAt: schema.attendances.checkedInAt })
      .from(schema.attendances).where(eq(schema.attendances.id, ids.ticket))
    expect(tia.status).toBe('ticket_holder')

    await host.attendance.checkIn({ eventId: ids.event, attendanceId: ids.ticket, undo: true })
    const [tiaOff] = await db.select({ checkedInAt: schema.attendances.checkedInAt }).from(schema.attendances).where(eq(schema.attendances.id, ids.ticket))
    expect(tiaOff.checkedInAt).toBeNull()

    // The ids the door list handed back are enough on their own.
    expect(ana.dancerId).toBe(ids.ana)
    expect(ben.dancerId).toBe(ids.ben)
    expect(fan.via).toBe('ticket')
  })

  it('keeps a guest’s check-in when the magic link confirms their account', async () => {
    const host = caller(ids.host)
    const mina = (await host.attendance.door({ eventId: ids.event })).guests.find(g => g.name === 'Mina Guest')!
    await host.attendance.checkIn({ eventId: ids.event, rsvpId: mina.rsvpId! })
    const [d] = await db.insert(schema.dancers).values({ email: `mina-${RUN}@test.wedance.local`, name: `Mina ${RUN}` }).returning({ id: schema.dancers.id })
    ids.mina = d.id
    await caller(d.id).rsvp.answer({ event: ids.event, answer: 'yes', guestToken: ids.guestToken })
    const [row] = await db.select({ checkedInAt: schema.attendances.checkedInAt }).from(schema.attendances)
      .where(and(eq(schema.attendances.eventId, ids.event), eq(schema.attendances.dancerId, d.id)))
    expect(row?.checkedInAt).toBeTruthy()
  })

  it('refuses a stranger and someone who is not on the list', async () => {
    await expect(caller(ids.stranger).attendance.door({ eventId: ids.event })).rejects.toThrow(/manage/i)
    await expect(caller(ids.stranger).attendance.checkIn({ eventId: ids.event, dancerId: ids.ana })).rejects.toThrow(/manage/i)
    await expect(caller(ids.host).attendance.checkIn({ eventId: ids.event, dancerId: ids.host })).rejects.toThrow(/not on this event/i)
  })
})
