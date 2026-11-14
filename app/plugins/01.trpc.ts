import { createTRPCClient, httpBatchLink, type TRPCLink } from '@trpc/client'
import { tap } from '@trpc/server/observable'
import type { AppRouter } from '../../server/trpc'
import { isPlanMutation, notifyPlanChanged } from '~/lib/planChanged'

// After a mutation that changes the dancer's plan succeeds, tell the plan
// counts (My plan badge, "in your week" pill) to refetch — RAZ-889.
const planChangedLink: TRPCLink<AppRouter> = () => ({ op, next }) => {
  const result = next(op)
  if (!isPlanMutation(op.type, op.path)) return result
  return result.pipe(tap({ next: () => notifyPlanChanged() }))
}

export default defineNuxtPlugin({
  name: 'trpc',
  setup() {
    // Session cookie — client vs. server strategy:
    //
    // On the CLIENT we use Nuxt's useCookie for reactive read/write so
    // login and sign-out persist to `document.cookie` automatically.
    //
    // On the SERVER (SSR) we must NOT call useCookie for this name:
    // Nuxt serialises every useCookie-accessed cookie into a Set-Cookie
    // response header.  Even when the value is unchanged, the header can
    // race against the browser's existing cookie (different Max-Age
    // epoch, re-serialisation artefacts) and — on some Nuxt 4 builds —
    // outright clear it.  Reading the raw Cookie header avoids all of
    // this: no Set-Cookie is emitted, the browser cookie is untouched.
    let sessionCookieRef: Ref<string | null>

    if (import.meta.client) {
      sessionCookieRef = useCookie('wedance-session', {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
        sameSite: 'lax' as const,
      })
    } else {
      const event = useRequestEvent()
      const raw = event?.node?.req?.headers?.cookie ?? ''
      const m = raw.match(/(?:^|;\s*)wedance-session=([^;]*)/)
      sessionCookieRef = ref(m?.[1] ?? null)
    }

    const authToken = ref<string | null>(sessionCookieRef.value ?? null)
    // Admin "view as" (useViewAs): sent only from /business pages, so the rest of
    // the app — admin included — stays the admin's own.
    const viewAs = useViewAs()
    const router = useRouter()

    const trpc = createTRPCClient<AppRouter>({
      links: [
        planChangedLink,
        httpBatchLink({
          url: '/api/trpc',
          headers() {
            const token = authToken.value
            if (!token) return {}
            const as = viewAs.value?.id && router.currentRoute.value.path.startsWith('/business') ? viewAs.value.id : null
            return as ? { authorization: `Bearer ${token}`, 'x-wedance-view-as': as } : { authorization: `Bearer ${token}` }
          },
        }),
      ],
    })

    return {
      provide: {
        trpc,
        setAuthToken: (token: string | null) => {
          authToken.value = token
          if (import.meta.client) {
            sessionCookieRef.value = token
          }
        },
      },
    }
  },
})
