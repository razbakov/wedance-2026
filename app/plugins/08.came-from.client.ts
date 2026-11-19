/**
 * Where this visit came from (RAZ-1074, shared/utils/cameFrom.ts): the utm_* tags and outside referrer of the
 * page the visitor landed on, kept for the tab (sessionStorage) and sent with an event sign-up, so the page
 * that runs the event sees in Contacts how the dancer found it. First touch in the tab wins; a later link
 * with its own utm_* tags replaces it.
 */
import { cameFromLanding } from '#shared/utils/cameFrom'

export const CAME_FROM_KEY = 'wd_came_from'

export default defineNuxtPlugin(() => {
  const router = useRouter()
  const save = (query: Record<string, unknown>, referrer: string) => {
    const found = cameFromLanding(query, referrer, location.host)
    if (!found) return
    try {
      const had = sessionStorage.getItem(CAME_FROM_KEY)
      if (had && !Object.keys(found).some(k => k.startsWith('utm_'))) return
      sessionStorage.setItem(CAME_FROM_KEY, JSON.stringify(found))
    } catch { /* private mode: nothing kept */ }
  }
  router.isReady().then(() => save(router.currentRoute.value.query, document.referrer))
  router.afterEach((to, from) => { if (from.matched.length && to.query.utm_source) save(to.query, '') })
})
