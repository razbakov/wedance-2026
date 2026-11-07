import { eq, and, ne } from 'drizzle-orm'
import { instagramConnections, profiles } from '../../database/schema'
import { signPayload, verifyPayload } from '../../oauth/crypto'
import { INSTAGRAM_SCOPES } from './config'
import { encryptToken, decryptToken } from './tokenCrypto'
import type { IgAccount } from './graph'

/**
 * A page's connected Instagram account (#501): the OAuth `state`, choosing the
 * account Meta returned, saving it, and reading the token back for a call.
 *
 * Our sessions are bearer tokens, not cookies, so the browser redirect from
 * Meta can't prove who it is — the signed `state` carries who started it, for
 * which page, and expires after 15 minutes.
 */
const STATE_PURPOSE = 'meta-instagram-connect'

export interface ConnectState { profileId: string; dancerId: string; username: string }

export function signConnectState(s: ConnectState, now = Date.now()): string {
  return signPayload(STATE_PURPOSE, { p: s.profileId, d: s.dancerId, u: s.username }, 15 * 60, now)
}

export function verifyConnectState(token: string | null | undefined, now = Date.now()): ConnectState | null {
  const v = verifyPayload<{ p: string; d: string; u: string }>(STATE_PURPOSE, token, now)
  return v && v.p && v.d && v.u ? { profileId: v.p, dancerId: v.d, username: v.u } : null
}

/**
 * Which of the granted accounts this page gets: the one whose handle matches
 * the page's Instagram link (or aliases), else the only one granted.
 * Several and none match → null (the person picks again with just one).
 */
export function pickAccount(accounts: IgAccount[], page: { socials?: { platform: string; url: string }[] | null; instagramAliases?: string[] | null; username: string }): IgAccount | null {
  if (accounts.length === 1) return accounts[0]!
  const ig = (page.socials ?? []).find(s => s.platform.toLowerCase() === 'instagram')?.url ?? ''
  const main = ig.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').split(/[/?#]/)[0]!.toLowerCase()
  const known = new Set([main, page.username.toLowerCase(), ...(page.instagramAliases ?? [])].filter(Boolean))
  return accounts.find(a => known.has(a.username)) ?? null
}

export class ConnectError extends Error {
  constructor(message: string, public reason: 'no_account' | 'several_accounts' | 'taken') {
    super(message)
  }
}

/** Save (or replace) the page's connection. An account already on another page is refused. */
export async function saveConnection(db: any, input: { profileId: string; dancerId: string; account: IgAccount; token: string; expiresAt: Date | null }) {
  const { account } = input
  const [other] = await db.select({ username: profiles.username }).from(instagramConnections)
    .innerJoin(profiles, eq(profiles.id, instagramConnections.profileId))
    .where(and(eq(instagramConnections.igUserId, account.id), ne(instagramConnections.profileId, input.profileId)))
  if (other) throw new ConnectError(`@${account.username} is already connected to @${other.username} on WeDance. Disconnect it there first.`, 'taken')

  const values = {
    profileId: input.profileId,
    igUserId: account.id,
    igUsername: account.username,
    igName: account.name,
    igPicture: account.picture,
    tokenEnc: encryptToken(input.token),
    tokenKind: input.expiresAt ? 'user' as const : 'system_user' as const,
    tokenExpiresAt: input.expiresAt,
    scopes: [...INSTAGRAM_SCOPES],
    connectedBy: input.dancerId,
    connectedAt: new Date(),
    lastError: null,
    lastErrorAt: null,
  }
  await db.insert(instagramConnections).values(values)
    .onConflictDoUpdate({ target: instagramConnections.profileId, set: values })
  return values
}

/** The page's connection with its token readable, or null when not connected. */
export async function connectionWithToken(db: any, profileId: string) {
  const [c] = await db.select().from(instagramConnections).where(eq(instagramConnections.profileId, profileId))
  if (!c) return null
  return { ...c, token: decryptToken(c.tokenEnc) }
}

/** What the page editor shows — never the token. */
export function publicConnection(c: { igUsername: string; igName: string | null; igPicture: string | null; connectedAt: Date; lastError: string | null } | null | undefined) {
  return c ? { username: c.igUsername, name: c.igName, picture: c.igPicture, connectedAt: c.connectedAt, lastError: c.lastError } : null
}

export async function noteError(db: any, profileId: string, message: string) {
  await db.update(instagramConnections).set({ lastError: message.slice(0, 500), lastErrorAt: new Date() }).where(eq(instagramConnections.profileId, profileId))
}
