import { User, Settings, Briefcase, Music, ShieldCheck, Bookmark } from 'lucide-vue-next'
import { initialOf } from '#shared/utils/initials'

export type NavMode = 'dance' | 'business' | 'admin'

/**
 * Account navigation shared by the dancing header (SiteHeader), the Business
 * layout and the Admin layout, so every side offers the same menu in the same
 * place. The one slot that differs is the mode switch: it lists the other
 * sides — Dancing, Business, and Admin for admins — never the current one.
 */
export function useAccountNav(mode: NavMode) {
  const { authHint, dancerName, username, photo, isAdmin, signOut } = useAuth()

  // Show signed-in UI during SSR/loading when both session + hint cookies exist,
  // so the header doesn't blink "Sign in" on page refresh.
  // Until hydration is done, render only what the server saw (the cookies): the
  // auth plugin restores name/photo/session from localStorage before mount, and
  // showing those on the first client pass mismatched the SSR header.
  const hydrated = useHydrated()
  const appearsSignedIn = useAppearsSignedIn()
  const displayName = computed(() => (hydrated.value && dancerName.value) || authHint.value?.name || 'Profile')
  const displayUsername = computed(() => (hydrated.value && username.value) || authHint.value?.username || null)
  const avatar = computed(() => (hydrated.value && photo.value) || authHint.value?.photo || null)
  const initial = computed(() => initialOf(displayName.value))
  const profileTo = computed(() => displayUsername.value ? `/u/${displayUsername.value}` : '/settings')

  const accountLinks = computed(() => [
    { to: profileTo.value, label: 'My profile', icon: User },
    { to: '/shortlist', label: 'Shortlist', icon: Bookmark },
    { to: '/settings', label: 'Settings', icon: Settings },
  ])

  // Admins see what waits for them on the Admin link from every side (claims, videos, groups).
  const { counts: adminCounts, total: adminTotal } = useAdminAttention()
  const adminHint = computed(() => {
    const c = adminCounts.value
    const parts = [
      c.claims ? `${c.claims} claim${c.claims === 1 ? '' : 's'}` : '',
      c.videos ? `${c.videos} video${c.videos === 1 ? '' : 's'}` : '',
      c.groups ? `${c.groups} group${c.groups === 1 ? '' : 's'}` : '',
    ].filter(Boolean)
    return parts.length ? `${parts.join(' · ')} waiting` : 'Users, claims, festivals & moderation'
  })

  const sides = computed(() => [
    { mode: 'dance' as const, to: '/my-plan', label: 'Dancing', hint: 'Festivals, cities & your plan', icon: Music, count: 0 },
    { mode: 'business' as const, to: '/business', label: 'Business', hint: 'Your events, venues & profiles', icon: Briefcase, count: 0 },
    ...(isAdmin.value
      ? [{ mode: 'admin' as const, to: '/admin', label: 'Admin', hint: adminHint.value, icon: ShieldCheck, count: adminTotal.value }]
      : []),
  ])
  const switchLinks = computed(() => sides.value.filter(s => s.mode !== mode))
  /** Something behind a switch link waits on me: a dot on the avatar / Me tab. */
  const switchAttention = computed(() => switchLinks.value.some(l => l.count > 0))

  function handleSignOut() {
    signOut()
    navigateTo('/')
  }

  return {
    appearsSignedIn,
    displayName,
    displayUsername,
    initial,
    photo: avatar,
    profileTo,
    accountLinks,
    switchLinks,
    switchAttention,
    handleSignOut,
  }
}
