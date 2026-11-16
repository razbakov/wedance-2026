/**
 * "You both said yes" (RAZ-985): when a Yes — in the Meet deck or a wave on a
 * festival page — meets a Yes back, it's a match. The dancer who just said yes
 * sees it at once (the procedure returns `match`); the other one gets one email,
 * so "we tell you both" holds even if they never open My plan.
 *
 * Email rules: once per pair (meet_match_emails), at most one a day per
 * recipient, only when the recipient hasn't turned it off (dancers.match_emails)
 * and only about a dancer they could see in their list anyway (public, with a
 * photo). Only yeses since MEET_MATCHES_SINCE count, like the list.
 */
import { and, desc, eq, gte, inArray } from 'drizzle-orm'
import { dancers, discoverSwipes, festivalWaves, meetMatchEmails } from '../database/schema'
import { MEET_MATCHES_SINCE, meetMatches } from './meetMatches'
import { sendMeetMatchEmail } from './email'
import { signPayload, verifyPayload } from '../oauth/crypto'
import { formatEventWhen } from '../../shared/utils/eventTime'
import { trackServer } from './posthog'

type Db = any

const DAY = 86400_000
const OFF_PURPOSE = 'match-emails-off'
const OFF_TTL = 3 * 365 * 24 * 3600

function siteUrl() {
  let url: string | undefined
  try { url = useRuntimeConfig().siteUrl as string | undefined } catch { /* outside Nuxt (tests, scripts) */ }
  return (url || 'https://2026.wedance.vip').replace(/\/$/, '')
}

/** The link in the email that turns these emails off — signed, no sign-in needed. */
export const matchEmailsOffSig = (dancerId: string) => signPayload(OFF_PURPOSE, { d: dancerId }, OFF_TTL)
export const matchEmailsOffUrl = (dancerId: string) =>
  `${siteUrl()}/api/match-emails/off?sig=${encodeURIComponent(matchEmailsOffSig(dancerId))}`
export function verifyMatchEmailsOff(sig: string | null | undefined): string | null {
  const v = verifyPayload<{ d: string }>(OFF_PURPOSE, sig)
  return v?.d ?? null
}

export type YesVia = { kind: 'deck' } | { kind: 'wave'; festivalSlug: string }

/** Did `to` already say yes back to `from` (since the cut-off)? Deck: anywhere in the deck. Wave: on the same festival. */
export async function yesBack(db: Db, fromId: string, toId: string, via: YesVia, since = MEET_MATCHES_SINCE): Promise<boolean> {
  const rows = via.kind === 'deck'
    ? await db.select({ id: discoverSwipes.id }).from(discoverSwipes).where(and(
        eq(discoverSwipes.dancerId, toId),
        eq(discoverSwipes.targetKind, 'dancer'),
        eq(discoverSwipes.targetId, fromId),
        eq(discoverSwipes.decision, 'yes'),
        gte(discoverSwipes.createdAt, since),
      )).limit(1)
    : await db.select({ id: festivalWaves.id }).from(festivalWaves).where(and(
        eq(festivalWaves.festivalSlug, via.festivalSlug),
        eq(festivalWaves.dancerId, toId),
        eq(festivalWaves.targetDancerId, fromId),
        gte(festivalWaves.createdAt, since),
      )).limit(1)
  return rows.length > 0
}

export type EmailSkip = 'off' | 'no_email' | 'not_shown' | 'already' | 'today' | 'error'

/**
 * Whether `recipientId` may get the email about `otherId` now; null = yes.
 * Pure decision over what the caller loaded — unit-tested.
 */
export function matchEmailBlock(p: {
  recipient: { email: string | null; matchEmails: boolean } | null
  other: { photo: string | null; profilePublic: boolean | null } | null
  alreadySentForPair: boolean
  lastSentAt: Date | null
  now: Date
}): EmailSkip | null {
  if (!p.recipient?.email) return 'no_email'
  if (!p.recipient.matchEmails) return 'off'
  if (!p.other || p.other.profilePublic === false || !p.other.photo) return 'not_shown'
  if (p.alreadySentForPair) return 'already'
  if (p.lastSentAt && p.now.getTime() - p.lastSentAt.getTime() < DAY) return 'today'
  return null
}

const firstName = (n: string | null | undefined) => (n ?? '').trim().split(/\s+/)[0] || ''

/**
 * Call right after `fromId` said yes to `toId`. Returns whether it's a match and,
 * when an email is due, a promise that sends it (hand it to ctx.waitUntil).
 */
export async function onYes(db: Db, fromId: string, toId: string, via: YesVia, now = new Date()): Promise<{ match: boolean; emailed: boolean; skip: EmailSkip | null; send: Promise<void> | null }> {
  if (fromId === toId || !(await yesBack(db, fromId, toId, via))) return { match: false, emailed: false, skip: null, send: null }

  const people: Array<{ id: string; email: string | null; name: string; photo: string | null; profilePublic: boolean | null; matchEmails: boolean }> = await db
    .select({ id: dancers.id, email: dancers.email, name: dancers.name, photo: dancers.photo, profilePublic: dancers.profilePublic, matchEmails: dancers.matchEmails })
    .from(dancers)
    .where(inArray(dancers.id, [toId, fromId]))
  const recipient = people.find(p => p.id === toId) ?? null
  const other = people.find(p => p.id === fromId) ?? null

  const [pair] = await db.select({ id: meetMatchEmails.id }).from(meetMatchEmails)
    .where(and(eq(meetMatchEmails.recipientId, toId), eq(meetMatchEmails.otherId, fromId))).limit(1)
  const [last] = await db.select({ sentAt: meetMatchEmails.sentAt }).from(meetMatchEmails)
    .where(eq(meetMatchEmails.recipientId, toId)).orderBy(desc(meetMatchEmails.sentAt)).limit(1)

  const skip = matchEmailBlock({ recipient, other, alreadySentForPair: !!pair, lastSentAt: last?.sentAt ? new Date(last.sentAt) : null, now })
  if (skip) return { match: true, emailed: false, skip, send: null }

  // The unsubscribe link must exist before anything is claimed: no link, no email.
  let unsubscribeUrl: string
  try { unsubscribeUrl = matchEmailsOffUrl(toId) }
  catch (e) {
    console.warn('[meet-match] no unsubscribe link', (e as Error)?.message ?? e)
    return { match: true, emailed: false, skip: 'error', send: null }
  }

  // Claim the pair first, so two quick yeses can't send twice.
  const claimed = await db.insert(meetMatchEmails).values({ recipientId: toId, otherId: fromId, sentAt: now })
    .onConflictDoNothing().returning({ id: meetMatchEmails.id })
  if (!claimed.length) return { match: true, emailed: false, skip: 'already', send: null }

  const send = (async () => {
    // The night out, as the recipient will see it on My plan.
    let night: { name: string; when: string; link: string } | null = null
    try {
      const m = (await meetMatches(db, toId, { now, since: MEET_MATCHES_SINCE })).find(x => x.dancerId === fromId)
      if (m?.night) night = { name: m.night.name, when: formatEventWhen(m.night.startISO, null, m.night.timezone || undefined), link: `${siteUrl()}${m.night.path}` }
    } catch (e) { console.warn('[meet-match] night lookup failed', (e as Error)?.message ?? e) }
    await sendMeetMatchEmail({
      to: recipient!.email!,
      name: firstName(recipient!.name) || 'there',
      other: firstName(other!.name) || other!.name,
      night,
      link: `${siteUrl()}/my-plan#dance-friends`,
      unsubscribeUrl,
    })
  })().catch(e => console.warn('[meet-match] email failed', (e as Error)?.message ?? e))

  return { match: true, emailed: true, skip: null, send }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * From a tRPC procedure, after the signed-in dancer said yes to `toId`: checks for
 * a match, hands the email to ctx.waitUntil and counts `server_meet_matched`.
 * Never throws — a failed check must not fail the Yes itself.
 */
export async function afterYes(
  ctx: { db: Db; dancerId: string; waitUntil?: (p: Promise<unknown>) => void },
  toId: string,
  via: YesVia,
): Promise<{ match: boolean }> {
  if (!UUID_RE.test(toId)) return { match: false }
  try {
    const r = await onYes(ctx.db, ctx.dancerId, toId, via)
    if (r.send) { if (ctx.waitUntil) ctx.waitUntil(r.send); else await r.send }
    if (r.match) trackServer(ctx, 'meet_matched', { via: via.kind === 'deck' ? 'deck' : 'festival', emailed: r.emailed, email_skip: r.skip })
    return { match: r.match }
  } catch (e) {
    console.warn('[meet-match] check failed', (e as Error)?.message ?? e)
    return { match: false }
  }
}
