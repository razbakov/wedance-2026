/**
 * Pure logic for the "Join WeDance" onboarding quest machine.
 *
 * Kept in its own module so it can be unit-tested without booting Nitro / Nuxt
 * globals (mirrors server/api/webhooks/tickettailor.lib.ts). Every function
 * takes a db-like argument (the real drizzle db, or a FakeDb in tests) so the
 * suite stays hermetic — no Neon round-trip to run `bun run test`.
 *
 * See ./candidates.post.ts, ./[id].get.ts, ./[id]/advance.post.ts and
 * ./[id]/cuj.post.ts for the HTTP wrappers.
 */
import { timingSafeEqual } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { useDb } from '../../utils/db'
import { onboardingCandidates } from '../../database/schema'

type Db = ReturnType<typeof useDb>

// The 13 critical-user-journey events the quest tracks. The brief called it
// "12", but the app fires 13 distinct events — each is its own grid cell.
export const CUJ_EVENTS = [
  'week_plan_add',
  'year_plan_add',
  'ticket_cta_click',
  'gig_cta_click',
  'signup_completed',
  'onboarding_completed',
  'profile_updated',
  'booking_request_submitted',
  'festival_draft_submitted',
  'shared_plan_signup',
  'ask_locals_post',
  'video_vote',
  'video_submit',
] as const

export type CujEvent = (typeof CUJ_EVENTS)[number]
export type CujStatus = 'pending' | 'green' | 'red'

export interface Quest {
  cuj_events: Record<string, CujStatus>
}

export interface HistoryEntry {
  event: string
  at: string
  data?: Record<string, unknown>
}

// Level 0→5 with the canonical names. Level 4 ("boss beaten") is set
// automatically once every CUJ event is green.
export const LEVEL_NAMES: Record<number, string> = {
  0: 'Invited',
  1: 'Joined',
  2: 'Claimed',
  3: 'Quest in progress',
  4: 'Boss beaten',
  5: 'Active',
}

/** A fresh quest payload: all 13 CUJ events pending. */
export function buildInitialQuest(): Quest {
  const cuj_events: Record<string, CujStatus> = {}
  for (const e of CUJ_EVENTS) cuj_events[e] = 'pending'
  return { cuj_events }
}

/** True only when every one of the 13 CUJ events is green. */
export function allCujGreen(quest: Quest | null | undefined): boolean {
  if (!quest || !quest.cuj_events) return false
  return CUJ_EVENTS.every(e => quest.cuj_events[e] === 'green')
}

/**
 * Constant-time secret comparison for the write endpoints. Fails closed when
 * the expected secret is not configured, or on any length/format mismatch.
 */
export function checkSecret(provided: string | undefined | null, expected: string | undefined | null): boolean {
  if (!expected || !provided) return false
  const a = Buffer.from(String(provided), 'utf8')
  const b = Buffer.from(String(expected), 'utf8')
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

// The full row shape the routes work with. `email` / `telegramId` are present
// here but are NEVER exposed by the public projection (see toSafeCandidate).
export interface CandidateRow {
  id: string
  name: string
  email: string | null
  telegramId: string | null
  role: string | null
  level: number
  quest: Quest | null
  accessGranted: boolean
  history: HistoryEntry[] | null
  createdAt?: unknown
  updatedAt?: unknown
}

export interface SafeCandidate {
  id: string
  name: string
  level: number
  quest: Quest
  accessGranted: boolean
}

/**
 * Public projection for the board. Deliberately drops email + telegramId — the
 * board page is public (noindex, but still unauthenticated), so PII must not
 * leak through GET /api/join/[id].
 */
export function toSafeCandidate(row: CandidateRow): SafeCandidate {
  return {
    id: row.id,
    name: row.name,
    level: row.level,
    quest: row.quest ?? buildInitialQuest(),
    accessGranted: row.accessGranted,
  }
}

export interface CreateCandidateInput {
  name: string
  email?: string | null
  telegramId?: string | null
  role?: string | null
}

/** Insert a fresh candidate at level 0 with an all-pending quest. */
export async function createCandidate(db: Db, input: CreateCandidateInput): Promise<CandidateRow> {
  const now = new Date()
  const [row] = await db
    .insert(onboardingCandidates)
    .values({
      name: input.name,
      email: input.email ?? null,
      telegramId: input.telegramId ?? null,
      role: input.role ?? null,
      level: 0,
      quest: buildInitialQuest(),
      accessGranted: false,
      history: [],
      createdAt: now,
      updatedAt: now,
    })
    .returning()
  return row as CandidateRow
}

/** Fetch one candidate by id, or null if it doesn't exist. */
export async function getCandidate(db: Db, id: string): Promise<CandidateRow | null> {
  const [row] = await db
    .select()
    .from(onboardingCandidates)
    .where(eq(onboardingCandidates.id, id))
  return (row as CandidateRow) ?? null
}

export interface AdvanceInput {
  event: string
  level?: number
  data?: Record<string, unknown>
}

/**
 * Append an event to the candidate's history, optionally set the level, and
 * bump updatedAt. Returns the updated candidate, or null if it doesn't exist.
 */
export async function recordAdvance(db: Db, id: string, input: AdvanceInput): Promise<CandidateRow | null> {
  const existing = await getCandidate(db, id)
  if (!existing) return null

  const history: HistoryEntry[] = Array.isArray(existing.history) ? [...existing.history] : []
  const entry: HistoryEntry = { event: input.event, at: new Date().toISOString() }
  if (input.data !== undefined) entry.data = input.data
  history.push(entry)

  const patch: Record<string, unknown> = { history, updatedAt: new Date() }
  if (typeof input.level === 'number') patch.level = input.level

  const [row] = await db
    .update(onboardingCandidates)
    .set(patch)
    .where(eq(onboardingCandidates.id, id))
    .returning()
  return (row as CandidateRow) ?? null
}

export interface CujInput {
  event: string
  status: 'green' | 'red'
}

export interface CujResult {
  candidate: CandidateRow
  allGreen: boolean
}

/**
 * Set the status of a single CUJ event. When the update makes all 13 events
 * green, the candidate is promoted to level 4 ("boss beaten"). Returns the
 * updated candidate + an `allGreen` flag, or null if the candidate is missing
 * or the event name is not one of the 13 tracked CUJ events.
 */
export async function recordCuj(db: Db, id: string, input: CujInput): Promise<CujResult | null> {
  if (!(CUJ_EVENTS as readonly string[]).includes(input.event)) return null

  const existing = await getCandidate(db, id)
  if (!existing) return null

  const base = existing.quest ?? buildInitialQuest()
  const quest: Quest = { cuj_events: { ...(base.cuj_events ?? {}) } }
  quest.cuj_events[input.event] = input.status

  const green = allCujGreen(quest)
  const patch: Record<string, unknown> = { quest, updatedAt: new Date() }
  if (green) patch.level = 4

  const [row] = await db
    .update(onboardingCandidates)
    .set(patch)
    .where(eq(onboardingCandidates.id, id))
    .returning()

  return { candidate: (row as CandidateRow) ?? existing, allGreen: green }
}
