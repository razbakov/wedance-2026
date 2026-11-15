/**
 * Admin sections, shared by the Admin sidebar (desktop) and the phone tab bar
 * (SiteTabBar mode="admin"). `tab: true` = one of the three bottom tabs on a
 * phone; the rest sit in the "Me" sheet above the account links (RAZ-943).
 * `badge` names the pending count the layout loads for that section.
 */
import type { Component } from 'vue'
import {
  LayoutDashboard, Video, Gift, Users, UtensilsCrossed, BadgeCheck, UserRound, Cpu, MapPin,
} from 'lucide-vue-next'

export type AdminBadge = 'videos' | 'claims' | 'groups'
export type AdminBadges = Partial<Record<AdminBadge, number | null>>

export interface AdminNavItem {
  to: string
  label: string
  /** Tab-bar label when `label` is too long for it. */
  short?: string
  icon: Component
  exact?: boolean
  badge?: AdminBadge
  tab?: boolean
}

export const ADMIN_NAV: AdminNavItem[] = [
  { to: '/admin', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, exact: true, tab: true },
  { to: '/admin/claims', label: 'Claims', icon: BadgeCheck, badge: 'claims', tab: true },
  { to: '/admin/users', label: 'Users', icon: UserRound, tab: true },
  { to: '/admin/videos', label: 'Videos', icon: Video, badge: 'videos' },
  { to: '/admin/cities', label: 'Cities', icon: MapPin },
  { to: '/admin/community-groups', label: 'Community', icon: Users, badge: 'groups' },
  { to: '/admin/festivals', label: 'Festivals', icon: UtensilsCrossed },
  { to: '/admin/giveaways', label: 'Giveaways', icon: Gift },
  { to: '/admin/ai-usage', label: 'AI usage', icon: Cpu },
]

export function adminNavActive(item: Pick<AdminNavItem, 'to' | 'exact'>, path: string): boolean {
  if (item.exact) return path === item.to || path === `${item.to}/`
  return path === item.to || path.startsWith(`${item.to}/`)
}
