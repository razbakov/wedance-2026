import type { AdminBadges } from '~/lib/admin-nav'

/**
 * What waits on an admin (claims, videos, local groups — `admin.attention`), so an admin
 * browsing any page sees it on the Admin link and the Me tab, and Admin sees it per section.
 * Loaded by plugins/07.admin-attention.client.ts on sign-in, navigation (at most once a
 * minute) and when the tab comes back; admin pages call `refresh(true)` after deciding.
 */
const MIN_GAP_MS = 60_000

export function useAdminAttention() {
  const { isAdmin } = useAuth()
  const counts = useState<AdminBadges>('admin-attention', () => ({}))
  const loadedAt = useState('admin-attention-at', () => 0)
  const total = computed(() => (isAdmin.value
    ? Object.values(counts.value).reduce<number>((n, c) => n + (c ?? 0), 0)
    : 0))

  async function refresh(force = false) {
    if (!import.meta.client) return
    if (!isAdmin.value) {
      counts.value = {}
      return
    }
    if (!force && Date.now() - loadedAt.value < MIN_GAP_MS) return
    loadedAt.value = Date.now()
    try {
      counts.value = await useNuxtApp().$trpc.admin.attention.query()
    } catch {
      // A failed count never blocks the page; the next navigation tries again.
      loadedAt.value = 0
    }
  }

  return { counts, total, refresh }
}
