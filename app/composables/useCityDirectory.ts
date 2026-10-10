import { WD } from '~/lib/brand'
import type { CityDirectory } from '~~/server/api/cities/[slug].get'

/**
 * Shared city-directory fetch + derived meta, used by /cities/[city] and its
 * per-role listing sub-pages (/cities/[city]/artists|organisers|venues).
 * SSR via the Nitro route so the people list and <title> ship in the HTML.
 */
export function useCityDirectory(slug: string) {
  const { data: dir, pending } = useFetch(`/api/cities/${slug}`, {
    key: `city-directory-${slug}`,
  })

  const cityName = computed(() =>
    dir.value?.city
    || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
  )

  const cityAccent: Record<string, string> = { munich: WD.red600, berlin: WD.cyan600 }
  const accent = cityAccent[slug] || WD.purple500

  const topStyles = computed(() => dir.value?.topStyles ?? [])
  const stylePhrase = computed(() => {
    const s = topStyles.value
    if (s.length >= 3) return `${s[0]}, ${s[1]} & ${s[2]}`
    if (s.length === 2) return `${s[0]} & ${s[1]}`
    if (s.length === 1) return s[0]
    return 'Social Dance'
  })

  return { dir: dir as Ref<CityDirectory | null>, pending, cityName, accent, topStyles, stylePhrase }
}
