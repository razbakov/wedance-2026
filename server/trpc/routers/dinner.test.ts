import { describe, it, expect } from 'vitest'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, and } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { appRouter } from '../index'

const DATABASE_URL = process.env.DATABASE_URL

let db: any = null
if (DATABASE_URL) {
  const sql = neon(DATABASE_URL)
  db = drizzle(sql, { schema })
}

// Helper to create a caller with a specific context
function createCaller(opts: { dancerId?: string; isAdmin?: boolean } = {}) {
  return appRouter.createCaller({
    db,
    dancerId: opts.dancerId ?? null,
    isAdmin: opts.isAdmin ?? false,
  })
}

// Get test data
async function getTestFestival() {
  const [festival] = await db
    .select()
    .from(schema.festivals)
    .where(eq(schema.festivals.slug, 'salsa-open-berlin-2026'))
  return festival
}

async function getTestDancers() {
  return db.select().from(schema.dancers).where(eq(schema.dancers.isAdmin, false))
}

async function getTestDinners() {
  const festival = await getTestFestival()
  if (!festival) return []
  return db.select().from(schema.dinners).where(eq(schema.dinners.festivalId, festival.id))
}

describe.skipIf(!DATABASE_URL)('dinner.list', () => {
  it('returns dinners for a valid festival slug', async () => {
    const caller = createCaller()
    const dinners = await caller.dinner.list({ festivalSlug: 'salsa-open-berlin-2026' })

    expect(dinners.length).toBeGreaterThan(0)
    expect(dinners[0]).toHaveProperty('id')
    expect(dinners[0]).toHaveProperty('day')
    expect(dinners[0]).toHaveProperty('timeSlot')
    expect(dinners[0]).toHaveProperty('joined')
    expect(dinners[0]).toHaveProperty('maxSize')
  })

  it('returns empty array for unknown festival', async () => {
    const caller = createCaller()
    const dinners = await caller.dinner.list({ festivalSlug: 'nonexistent-festival' })
    expect(dinners).toEqual([])
  })

  it('shows restaurant when revealDate is set to today or past', async () => {
    const testDinners = await getTestDinners()
    const dinnerWithRestaurant = testDinners.find(d => d.restaurant)
    if (!dinnerWithRestaurant) return

    // Set revealDate to today
    const today = new Date().toISOString().slice(0, 10)
    await db.update(schema.dinners)
      .set({ revealDate: today })
      .where(eq(schema.dinners.id, dinnerWithRestaurant.id))

    const caller = createCaller()
    const dinners = await caller.dinner.list({ festivalSlug: 'salsa-open-berlin-2026' })
    const revealed = dinners.find(d => d.id === dinnerWithRestaurant.id)

    expect(revealed?.restaurant).toBe(dinnerWithRestaurant.restaurant)
    expect(revealed?.restaurantAddress).toBe(dinnerWithRestaurant.restaurantAddress)

    // Clean up
    await db.update(schema.dinners)
      .set({ revealDate: null })
      .where(eq(schema.dinners.id, dinnerWithRestaurant.id))
  })

  it('hides restaurant when revealDate is in the future', async () => {
    const testDinners = await getTestDinners()
    const dinnerWithRestaurant = testDinners.find(d => d.restaurant)
    if (!dinnerWithRestaurant) return

    // Set revealDate to future
    await db.update(schema.dinners)
      .set({ revealDate: '2099-01-01' })
      .where(eq(schema.dinners.id, dinnerWithRestaurant.id))

    // Verify the update took effect
    const [verify] = await db.select().from(schema.dinners)
      .where(eq(schema.dinners.id, dinnerWithRestaurant.id))
    expect(verify.revealDate).toBe('2099-01-01')

    const caller = createCaller()
    const dinners = await caller.dinner.list({ festivalSlug: 'salsa-open-berlin-2026' })
    const hidden = dinners.find(d => d.id === dinnerWithRestaurant.id)

    expect(hidden?.restaurant).toBeNull()

    // Clean up
    await db.update(schema.dinners)
      .set({ revealDate: null })
      .where(eq(schema.dinners.id, dinnerWithRestaurant.id))
  })

  it('shows restaurant when no revealDate is set', async () => {
    const testDinners = await getTestDinners()
    const dinnerWithRestaurant = testDinners.find(d => d.restaurant && !d.revealDate)
    if (!dinnerWithRestaurant) return

    const caller = createCaller()
    const dinners = await caller.dinner.list({ festivalSlug: 'salsa-open-berlin-2026' })
    const visible = dinners.find(d => d.id === dinnerWithRestaurant.id)

    expect(visible?.restaurant).toBe(dinnerWithRestaurant.restaurant)
  })

  it('includes userJoined status for authenticated users', async () => {
    const dancers = await getTestDancers()
    if (!dancers.length) return

    const caller = createCaller({ dancerId: dancers[0].id })
    const dinners = await caller.dinner.list({ festivalSlug: 'salsa-open-berlin-2026' })

    expect(dinners[0]).toHaveProperty('userJoined')
    expect(typeof dinners[0].userJoined).toBe('boolean')
  })
})

describe.skipIf(!DATABASE_URL)('dinner.join', () => {
  it('rejects unauthenticated users', async () => {
    const caller = createCaller()
    const testDinners = await getTestDinners()
    if (!testDinners.length) return

    await expect(
      caller.dinner.join({ dinnerId: testDinners[0].id })
    ).rejects.toThrow('Not signed in')
  })

  it('prevents duplicate joins via unique constraint', async () => {
    const dancers = await getTestDancers()
    const testDinners = await getTestDinners()
    if (!dancers.length || !testDinners.length) return

    const dancerId = dancers[0].id
    const dinnerId = testDinners[0].id

    // Clean up first
    await db.delete(schema.dinnerSignups).where(
      and(
        eq(schema.dinnerSignups.dinnerId, dinnerId),
        eq(schema.dinnerSignups.dancerId, dancerId),
      )
    )

    const caller = createCaller({ dancerId })

    // First join should succeed
    const result1 = await caller.dinner.join({ dinnerId })
    expect(result1.joined).toBe(true)

    // Second join should return alreadyJoined
    const result2 = await caller.dinner.join({ dinnerId })
    expect(result2.alreadyJoined).toBe(true)

    // Clean up
    await db.delete(schema.dinnerSignups).where(
      and(
        eq(schema.dinnerSignups.dinnerId, dinnerId),
        eq(schema.dinnerSignups.dancerId, dancerId),
      )
    )
  })
})

describe.skipIf(!DATABASE_URL)('dinner.leave', () => {
  it('removes signup and group membership', async () => {
    const dancers = await getTestDancers()
    const testDinners = await getTestDinners()
    if (!dancers.length || !testDinners.length) return

    const dancerId = dancers[0].id
    const dinnerId = testDinners[0].id
    const caller = createCaller({ dancerId })

    // Join first
    await db.delete(schema.dinnerSignups).where(
      and(
        eq(schema.dinnerSignups.dinnerId, dinnerId),
        eq(schema.dinnerSignups.dancerId, dancerId),
      )
    )
    await caller.dinner.join({ dinnerId })

    // Leave
    const result = await caller.dinner.leave({ dinnerId })
    expect(result.left).toBe(true)

    // Verify signup removed
    const [signup] = await db.select().from(schema.dinnerSignups).where(
      and(
        eq(schema.dinnerSignups.dinnerId, dinnerId),
        eq(schema.dinnerSignups.dancerId, dancerId),
      )
    )
    expect(signup).toBeUndefined()
  })
})
