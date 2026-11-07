/**
 * Meta's redirect after "Connect Instagram" (#501). Registered in the Meta app
 * (Unified login setup → Redirect URL) as https://2026.wedance.vip/api/meta/instagram/callback.
 *
 * The signed `state` says who started it and for which page (our sessions are
 * bearer tokens, so the redirect carries no session). The person must still
 * own the page. Then: code → system-user token → the Instagram account they
 * granted → saved (encrypted) on the page. Always ends on the page editor with
 * ?instagram=connected or ?instagram=<reason>.
 */
import { useDb } from '../../../utils/db'
import { membershipOf } from '../../../utils/profileAccess'
import { dancers, profiles } from '../../../database/schema'
import { eq } from 'drizzle-orm'
import { instagramRedirectUri } from '../../../utils/meta/config'
import { exchangeCode, assignedInstagramAccounts, MetaError } from '../../../utils/meta/graph'
import { verifyConnectState, pickAccount, saveConnection, ConnectError } from '../../../utils/meta/instagramConnection'
import { trackServerEvent, profileGroup } from '../../../utils/posthog'

export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const site = (useRuntimeConfig().siteUrl || 'https://2026.wedance.vip').replace(/\/$/, '')
  const state = verifyConnectState(typeof q.state === 'string' ? q.state : null)
  const back = (reason: string, username = state?.username) =>
    sendRedirect(event, username ? `/business/network/${encodeURIComponent(username)}?instagram=${reason}` : `/business?instagram=${reason}`, 302)

  if (!state) return back('expired', undefined)
  // They closed the dialog or said no.
  if (q.error || typeof q.code !== 'string') return back('cancelled')

  const db = useDb()
  const [d] = await db.select({ isAdmin: dancers.isAdmin }).from(dancers).where(eq(dancers.id, state.dancerId))
  const m = await membershipOf(db, state.profileId, state.dancerId)
  if (!d || (!d.isAdmin && m?.role !== 'owner')) return back('not_owner')

  try {
    const { token, expiresAt } = await exchangeCode(q.code, instagramRedirectUri(site))
    const accounts = await assignedInstagramAccounts(token)
    if (!accounts.length) throw new ConnectError('No Instagram account came back.', 'no_account')
    const [page] = await db.select({ username: profiles.username, type: profiles.type, socials: profiles.socials, instagramAliases: profiles.instagramAliases }).from(profiles).where(eq(profiles.id, state.profileId))
    if (!page) return back('expired')
    const account = pickAccount(accounts, page)
    if (!account) throw new ConnectError('Several Instagram accounts, none matching this page.', 'several_accounts')
    await saveConnection(db, { profileId: state.profileId, dancerId: state.dancerId, account, token, expiresAt })
    trackServerEvent(event, 'instagram_connected', state.dancerId, {
      channel: 'web', profile: page.username, profile_type: page.type, accounts_granted: accounts.length, ...profileGroup(page.username),
    })
    return back('connected', page.username)
  } catch (e: any) {
    if (e instanceof ConnectError) return back(e.reason)
    console.error('[instagram connect]', e instanceof MetaError ? `${e.code}/${e.subcode}: ${e.message}` : e)
    return back('failed')
  }
})
