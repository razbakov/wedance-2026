/**
 * In-app notices (no email, no push). A match is derived from the mutual yes
 * that already exists, so a dancer who was offline still hears about it the
 * next time they open WeDance. Toasts are temporary; the bell keeps the history.
 * Opening one (toast, bell, or the Meet card) clears the unread count. The
 * card on /meet and the row under the bell stay, so the meetup can be opened
 * again. A match toast shows once per match on this browser.
 */
import { matchNotice, unactedNotices, type Notice } from '#shared/utils/notices'

const ACTED_KEY = 'wedance-notices-acted'
/** v2: the small bottom-right toast. A previous visit's "already shown" does not count. */
const SHOWN_KEY = 'wedance-toasts-shown-v2'
const MATCH_TOAST_MS = 9000
const PLAIN_TOAST_MS = 4500

const notices = ref<Notice[]>([])
const openToasts = ref<Notice[]>([])
const bellOpen = ref(false)
const acted = ref<string[]>([])
const timers = new Map<string, ReturnType<typeof setTimeout>>()

function readIds(storage: Storage, key: string): string[] {
  try {
    const parsed = JSON.parse(storage.getItem(key) || '[]')
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : []
  } catch {
    return []
  }
}

function loadActed() {
  if (!import.meta.client) return
  acted.value = readIds(localStorage, ACTED_KEY)
}

function shownIds(): Set<string> {
  if (!import.meta.client) return new Set()
  return new Set(readIds(localStorage, SHOWN_KEY))
}

function markShown(id: string) {
  if (!import.meta.client) return
  const ids = shownIds()
  ids.add(id)
  localStorage.setItem(SHOWN_KEY, JSON.stringify([...ids]))
}

function showToast(notice: Notice) {
  if (openToasts.value.some(t => t.id === notice.id)) return
  if (shownIds().has(notice.id)) return
  openToasts.value = [...openToasts.value, notice]
  markShown(notice.id)
  const prev = timers.get(notice.id)
  if (prev) clearTimeout(prev)
  timers.set(notice.id, setTimeout(() => dismissToast(notice.id), notice.prominent ? MATCH_TOAST_MS : PLAIN_TOAST_MS))
}

export function useNotices() {
  const { $trpc } = useNuxtApp()
  const { isSignedIn } = useAuth()

  const unacted = computed(() => unactedNotices(notices.value, acted.value))

  function dismissToast(id: string) {
    openToasts.value = openToasts.value.filter(t => t.id !== id)
    const timer = timers.get(id)
    if (timer) clearTimeout(timer)
    timers.delete(id)
  }

  /** They opened it. The toast goes away; the bell keeps the row, no longer counted. */
  function act(id: string, via: 'toast' | 'bell' | 'meet') {
    if (!acted.value.includes(id)) {
      acted.value = [...acted.value, id]
      if (import.meta.client) localStorage.setItem(ACTED_KEY, JSON.stringify(acted.value))
    }
    dismissToast(id)
    bellOpen.value = false
    const notice = notices.value.find(n => n.id === id) ?? openToasts.value.find(t => t.id === id)
    if (notice) useTrack().track('notice_opened', { kind: notice.kind, via })
  }

  function announce(notice: Notice) {
    loadActed()
    const rest = notices.value.filter(n => n.id !== notice.id)
    notices.value = [notice, ...rest].sort((a, b) => b.at.localeCompare(a.at))
    showToast(notice)
  }

  async function refresh() {
    if (!import.meta.client || !isSignedIn.value) return
    loadActed()
    try {
      const res = await $trpc.plan.notices.query()
      notices.value = res.notices
      openToasts.value = openToasts.value.map(t => res.notices.find(n => n.id === t.id) ?? t)
      // Once per match, including one they already opened. Opening clears the
      // badge; it must not swallow the toast they never saw.
      for (const n of res.notices) showToast(n)
    } catch (err) {
      console.warn('[notices] load failed:', err)
    }
  }

  function toggleBell() {
    bellOpen.value = !bellOpen.value
  }

  return {
    notices,
    unacted,
    openToasts,
    bellOpen,
    announce,
    refresh,
    dismissToast,
    act,
    toggleBell,
    /** Test/helper: build the same notice the server sends, from a deck card. */
    matchNotice,
  }
}
