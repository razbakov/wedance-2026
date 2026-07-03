<script setup lang="ts">
/**
 * SiteFooter — the shared V3 footer on every page. One place to change
 * footer links, tagline, or legal.
 */
const { isSignedIn } = useAuth()

const columns = [
  {
    title: 'Dance',
    links: [
      { to: '/festivals', label: 'Festivals' },
      { to: '/cities', label: 'Cities' },
      { to: '/artists', label: 'Artists' },
    ],
  },
  {
    title: 'Get booked',
    links: [
      { to: '/gigs', label: 'Gigs' },
      { to: '/for-events', label: 'Private events' },
      { to: '/organizers', label: 'For organizers' },
    ],
  },
]

const year = 2026
</script>

<template>
  <footer class="border-t mt-8" style="border-color:#3b1f0d22; background:rgba(251, 245, 234, 0.6);">
    <div class="max-w-6xl mx-auto px-4 py-12">
      <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <!-- Brand + tagline -->
        <div class="lg:col-span-2">
          <Brand />
          <p class="mt-3 text-sm max-w-xs leading-relaxed" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            Every dance, every teacher, every city — and who's going before you book.
          </p>
        </div>

        <!-- Link columns -->
        <div v-for="col in columns" :key="col.title">
          <div class="text-[10px] uppercase tracking-[0.3em] font-bold mb-3" style="color:#9a5614;">{{ col.title }}</div>
          <ul class="space-y-2">
            <li v-for="l in col.links" :key="l.to">
              <NuxtLink
                :to="l.to"
                class="text-sm italic hover:underline"
                style="color:#5b3a1d; font-family:'Playfair Display', serif;"
              >{{ l.label }}</NuxtLink>
            </li>
            <li v-if="col.title === 'Get booked'">
              <NuxtLink
                v-if="isSignedIn"
                to="/my-plan"
                class="text-sm italic hover:underline"
                style="color:#5b3a1d; font-family:'Playfair Display', serif;"
              >My plan</NuxtLink>
            </li>
          </ul>
        </div>
      </div>

      <!-- Bottom bar -->
      <div class="mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3" style="border-color:#3b1f0d15;">
        <div class="text-xs" style="color:#9a5614; font-family: system-ui, sans-serif;">
          © {{ year }} WeDance
        </div>
        <div class="text-sm" style="font-family:'Caveat', cursive; font-size:18px; color:#9a5614;">
          Made for dancers, by dancers.
        </div>
      </div>
    </div>
  </footer>
</template>
