/**
 * "How was it?" for one dated event (RAZ-1011), shared by the plain event page (`events/[id].vue`)
 * and an event with a programme (`FestivalView` with `planAs: 'event'`): whether this dancer may
 * rate it now (`review.eventAsk`), the email's `?rate=N` / `?review=missed&t=` links, and what the
 * Reviews tab says about who can review.
 */
import { isUuid } from '#shared/utils/eventSlug'
import { rateFromQuery } from '#shared/utils/eventReview'

export type EventReviewAsk = {
  open: boolean
  opensAt: string | null
  signedIn: boolean
  went: boolean
  missed: boolean
  mine: { rating: number; text: string | null } | null
}

export function useEventReviewAsk(opts: {
  /** The event's id; null = not a real dated event (no ask). */
  eventId: () => string | null | undefined
  /** Cancelled, a preview…: never ask. */
  blocked?: () => boolean
  /** Open the page's Reviews tab (after a post). */
  openReviews: () => void
}) {
  const { $trpc } = useNuxtApp()
  const route = useRoute()
  const { isSignedIn } = useAuth()

  const ask = ref<EventReviewAsk | null>(null)
  const rateParam = computed(() => rateFromQuery(route.query.rate))
  const missedToken = computed(() => (route.query.review === 'missed' && typeof route.query.t === 'string' ? route.query.t : null))
  // Bumped after a post: the Reviews list and the stars under the picture load again.
  const reviewsKey = ref(0)

  async function load() {
    const id = opts.eventId()
    if (!id || !isUuid(id)) { ask.value = null; return }
    try { ask.value = await $trpc.review.eventAsk.query({ eventId: id }) } catch { /* stays as it was */ }
  }
  onMounted(load)
  watch(opts.eventId, load)
  watch(isSignedIn, load)

  const show = computed(() => {
    const a = ask.value
    if (!a || opts.blocked?.()) return false
    if (missedToken.value) return true
    if (!a.open || a.missed) return false
    return a.went || (!a.signedIn && !!rateParam.value)
  })

  // A star link from the email opened the page: once per mount.
  watch(show, (v) => {
    const id = opts.eventId()
    if (v && rateParam.value && id) useTrack().trackOnce(`rate:${id}`, 'review_ask_opened', { event_id: id, rating: rateParam.value, signed_in: isSignedIn.value, went: !!ask.value?.went })
  })

  function onPosted() {
    load()
    reviewsKey.value++
    opts.openReviews()
  }

  // What the Reviews tab says about who can write one (where the reader looks).
  const note = computed(() => {
    const a = ask.value
    if (!a || opts.blocked?.()) return ''
    if (!a.open) return 'Going? You can review it the day after — we’ll send you a link.'
    if (a.went && !a.mine && !a.missed) return 'You went — rate it at the top of the page.'
    return 'Reviews are from people who went.'
  })

  const notAllowed = computed(() => !!ask.value?.signedIn && !!rateParam.value && !!ask.value.open && !ask.value.went && !missedToken.value && !opts.blocked?.())

  return { ask, load, show, rateParam, missedToken, reviewsKey, onPosted, note, notAllowed }
}
