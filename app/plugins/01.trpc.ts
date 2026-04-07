import { createTRPCClient, httpBatchLink } from '@trpc/client'
import type { AppRouter } from '../../server/trpc'

export default defineNuxtPlugin({
  name: 'trpc',
  setup() {
  const sessionCookie = useCookie('wedance-session', {
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
    sameSite: 'lax' as const,
  })

  const authToken = useState<string | null>('trpc-auth-token', () => sessionCookie.value ?? null)

  const trpc = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        headers() {
          const token = authToken.value
          if (token) {
            return { authorization: `Bearer ${token}` }
          }
          return {}
        },
      }),
    ],
  })

  return {
    provide: {
      trpc,
      setAuthToken: (token: string | null) => {
        authToken.value = token
        sessionCookie.value = token
      },
    },
  }
  },
})
