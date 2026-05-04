import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error('DATABASE_URL is required')

const sql = neon(DATABASE_URL)
const db = drizzle(sql, { schema })

const festivalData = [
  { slug: 'salsa-open-berlin-2026', name: 'Salsa Open Berlin 2026', startDate: '2026-06-11', endDate: '2026-06-14', maxFreeSpots: 10, stripePaymentLink: 'https://buy.stripe.com/test_placeholder', ticketUrl: null as string | null },
  { slug: 'meneate-viena-2026', name: '¡Menéate Viena! 2026', startDate: '2026-03-26', endDate: '2026-03-29', maxFreeSpots: 10, stripePaymentLink: 'https://buy.stripe.com/test_placeholder', ticketUrl: null },
  { slug: 'cuban-fire-munich-2026', name: 'Cuban Fire in Munich', startDate: '2026-03-14', endDate: '2026-03-15', maxFreeSpots: 10, stripePaymentLink: 'https://buy.stripe.com/test_placeholder', ticketUrl: null },
  { slug: 'caribbean-urban-fire-munich-2026', name: 'Caribbean Urban Fire', startDate: '2026-03-21', endDate: '2026-03-22', maxFreeSpots: 10, stripePaymentLink: 'https://buy.stripe.com/test_placeholder', ticketUrl: null },
  // O-008 PR 1: Charanga Habanera Munich (single-night concert at La Rumba).
  // TicketTailor event ev_8158745 — buyers verified via /api/webhooks/tickettailor.
  // Concert shape: maxFreeSpots stays 0 (no free roster), tickets handled by TicketTailor (no Stripe link).
  { slug: 'charanga-habanera-munich-2026', name: 'David Calzado & Charanga Habanera in Munich', startDate: '2026-05-23', endDate: '2026-05-23', maxFreeSpots: 0, stripePaymentLink: null, ticketUrl: 'https://www.tickettailor.com/events/montunoclub/2183096' },
]

async function seed() {
  console.log('Seeding database...')
  const { eq } = require('drizzle-orm')

  // Create all festivals and their dinners
  for (const f of festivalData) {
    const [festival] = await db.insert(schema.festivals).values(f).onConflictDoNothing().returning()
    const festivalId = festival?.id || (await db.select().from(schema.festivals).where(eq(schema.festivals.slug, f.slug)))[0]?.id
    if (!festivalId) { console.warn(`Skipping festival ${f.slug}`); continue }
    console.log(`Festival ${f.slug}: ${festivalId}`)
    // Concert-shaped events (maxFreeSpots === 0) get no dinners.
    if (f.maxFreeSpots > 0) {
      await seedDinners(festivalId, f.startDate, f.endDate)
    }
  }

  await seedDancers()

  // Seed signups for salsa-open-berlin only (demo data)
  const { eq: eq2 } = require('drizzle-orm')
  const [salsaOpen] = await db.select().from(schema.festivals).where(eq2(schema.festivals.slug, 'salsa-open-berlin-2026'))
  if (salsaOpen) {
    await seedSignups(salsaOpen.id)
    await seedFestivalSignups(salsaOpen.id)
  }
}

async function seedDinners(festivalId: string, startDate: string, endDate: string) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const start = new Date(startDate)
  const end = new Date(endDate)
  let count = 0

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10)
    const day = dayNames[d.getDay()]
    await db.insert(schema.dinners).values({
      festivalId,
      day,
      date: dateStr,
      timeSlot: '19:30 – 21:30',
      restaurant: null,
      restaurantAddress: null,
      revealDate: null,
      maxSize: 6,
    }).onConflictDoNothing()
    count++
  }
  console.log(`Seeded ${count} dinners for festival ${festivalId}`)
}

async function seedDancers() {
  const dancers = [
    { email: 'ana@example.com', name: 'Ana Rodriguez' },
    { email: 'carlos@example.com', name: 'Carlos Rivera' },
    { email: 'maria@example.com', name: 'Maria Gonzalez' },
    { email: 'kenji@example.com', name: 'Kenji Yamamoto' },
    { email: 'nadia@example.com', name: 'Nadia Popov' },
    { email: 'sofia@example.com', name: 'Sofia Chen' },
    { email: 'rafael@example.com', name: 'Rafael Santos' },
    { email: 'camila@example.com', name: 'Camila Vega' },
    { email: 'admin@wedance.vip', name: 'Admin', isAdmin: true },
  ]

  for (const d of dancers) {
    await db.insert(schema.dancers).values(d).onConflictDoNothing()
  }
  console.log(`Seeded ${dancers.length} dancers`)
}

async function seedSignups(festivalId: string) {
  const { eq } = require('drizzle-orm')
  const allDinners = await db.select().from(schema.dinners).where(eq(schema.dinners.festivalId, festivalId)).orderBy(schema.dinners.day, schema.dinners.timeSlot)
  const allDancers = await db.select().from(schema.dancers).where(eq(schema.dancers.isAdmin, false)).orderBy(schema.dancers.email)

  if (!allDinners.length || !allDancers.length) return

  // Sign up 5 dancers for the first dinner, 4 for the second
  for (let i = 0; i < Math.min(5, allDancers.length); i++) {
    await db.insert(schema.dinnerSignups).values({
      dinnerId: allDinners[0].id,
      dancerId: allDancers[i].id,
    }).onConflictDoNothing()
  }
  for (let i = 0; i < Math.min(4, allDancers.length); i++) {
    await db.insert(schema.dinnerSignups).values({
      dinnerId: allDinners[1].id,
      dancerId: allDancers[i].id,
    }).onConflictDoNothing()
  }
  console.log('Seeded dinner signups')
}

async function seedFestivalSignups(festivalId: string) {
  const { eq } = require('drizzle-orm')
  const allDancers = await db.select().from(schema.dancers).where(eq(schema.dancers.isAdmin, false)).orderBy(schema.dancers.email)

  if (!allDancers.length) return

  // Sign up 7 dancers for the festival (to demo 3 free spots left)
  for (let i = 0; i < Math.min(7, allDancers.length); i++) {
    await db.insert(schema.festivalSignups).values({
      festivalId,
      dancerId: allDancers[i].id,
      paidAmount: 0,
    }).onConflictDoNothing()
  }
  console.log('Seeded festival signups (7 dancers)')
}

seed()
  .then(() => { console.log('Done!'); process.exit(0) })
  .catch((e) => { console.error(e); process.exit(1) })
