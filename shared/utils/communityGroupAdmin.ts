/**
 * Admin → Community groups (RAZ-862): where each group stands, and the filters of the list.
 * The city page shows a group only when it is `visible` AND its link isn't dead
 * (communityGroup.listByCity), so "dead link" is its own state here: the admin who runs
 * "Check links" sees right in the list which groups that hid.
 */
import { sameDanceStyle } from '../dance-styles'

export type GroupState = 'listed' | 'dead' | 'pending' | 'hidden' | 'rejected'
export const GROUP_STATES: readonly GroupState[] = ['listed', 'dead', 'pending', 'hidden', 'rejected']
export const GROUP_STATE_LABEL: Record<GroupState, string> = {
  listed: 'Listed',
  dead: 'Dead links',
  pending: 'Waiting',
  hidden: 'Hidden',
  rejected: 'Declined',
}

export interface AdminGroup {
  citySlug: string
  name: string
  platform: string
  inviteUrl: string
  styles?: string[] | null
  source?: string | null
  status: 'visible' | 'hidden' | 'pending' | 'rejected'
  linkStatus: 'unknown' | 'ok' | 'dead'
  linkCheckedAt?: string | Date | null
}

export interface GroupFilters {
  q?: string
  city?: string
  platform?: string
  style?: string
  state?: GroupState | ''
}

/** Where a group stands: on the city page ("listed"), hidden by the link check ("dead"), or not shown for another reason. */
export function groupState(g: Pick<AdminGroup, 'status' | 'linkStatus'>): GroupState {
  if (g.status === 'pending') return 'pending'
  if (g.status === 'rejected') return 'rejected'
  if (g.status === 'hidden') return 'hidden'
  return g.linkStatus === 'dead' ? 'dead' : 'listed'
}

/** Platforms whose invite pages the link check can read (server/utils/groupLinkCheck.ts). */
export const isCheckable = (g: Pick<AdminGroup, 'platform'>) => g.platform === 'whatsapp' || g.platform === 'telegram'

const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export function matchesGroup(g: AdminGroup, f: GroupFilters): boolean {
  if (f.city && g.citySlug !== f.city) return false
  if (f.platform && g.platform !== f.platform) return false
  if (f.state && groupState(g) !== f.state) return false
  if (f.style && !(g.styles ?? []).some(s => sameDanceStyle(s, f.style!))) return false
  const q = f.q ? fold(f.q) : ''
  if (q && ![g.name, g.citySlug, g.inviteUrl, g.source ?? '', ...(g.styles ?? [])].some(v => fold(v).includes(q))) return false
  return true
}

/** How many groups are in each state, after every filter but the state one (the counts on the state chips). */
export function stateCounts(groups: AdminGroup[], f: GroupFilters): Record<GroupState | 'all', number> {
  const counts = { all: 0, listed: 0, dead: 0, pending: 0, hidden: 0, rejected: 0 }
  for (const g of groups) {
    if (!matchesGroup(g, { ...f, state: '' })) continue
    counts.all++
    counts[groupState(g)]++
  }
  return counts
}

/**
 * The filtered list, one section per city (cities A–Z by name, groups A–Z inside),
 * so a long list reads like the city pages it feeds.
 */
export function groupByCity<G extends AdminGroup>(groups: G[], f: GroupFilters, cityName: (slug: string) => string = s => s): { citySlug: string, cityName: string, groups: G[] }[] {
  const byCity = new Map<string, G[]>()
  for (const g of groups) {
    if (!matchesGroup(g, f)) continue
    const list = byCity.get(g.citySlug) ?? []
    list.push(g)
    byCity.set(g.citySlug, list)
  }
  return [...byCity.entries()]
    .map(([citySlug, list]) => ({
      citySlug,
      cityName: cityName(citySlug),
      groups: list.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.cityName.localeCompare(b.cityName))
}

/** The most recent link check among these groups, or null when none was checked. */
export function lastLinkCheck(groups: Pick<AdminGroup, 'linkCheckedAt'>[]): Date | null {
  let last: number | null = null
  for (const g of groups) {
    if (!g.linkCheckedAt) continue
    const t = new Date(g.linkCheckedAt).getTime()
    if (Number.isFinite(t) && (last === null || t > last)) last = t
  }
  return last === null ? null : new Date(last)
}

/**
 * Links the next "Check links" would visit: WhatsApp / Telegram groups that are listed or
 * waiting and weren't checked in the last 20 hours (mirrors communityGroup.checkLinks).
 */
export function linksDue(groups: AdminGroup[], now = Date.now()): number {
  const cutoff = now - 20 * 3600_000
  return groups.filter(g => isCheckable(g)
    && (g.status === 'visible' || g.status === 'pending')
    && (!g.linkCheckedAt || new Date(g.linkCheckedAt).getTime() < cutoff)).length
}

/** "just now", "5 min ago", "3 h ago", "2 days ago". */
export function checkedAgo(at: string | Date, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - new Date(at).getTime()) / 60_000))
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return `${d} day${d === 1 ? '' : 's'} ago`
}
