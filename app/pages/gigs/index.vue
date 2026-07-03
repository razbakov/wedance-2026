<script setup lang="ts">
/**
 * /gigs — the dance scene's opportunity board.
 * Organizers/clients post open roles; artists post service offers.
 * V3 tropical style. Distinct from /artists (which is browse-a-directory):
 * gigs is post-driven — "I need X" or "I offer Y".
 */
import { ArrowRight, MapPin, Calendar, Wallet, Plus, Megaphone, Hand } from 'lucide-vue-next'
import { mockGigs, type GigKind } from '~/data/mock-gigs'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — Gigs',
  meta: [
    { name: 'description', content: 'The dance scene\'s opportunity board — open roles at festivals and events, and artists offering their services.' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

const route = useRoute()
const kindParam = (Array.isArray(route.query.kind) ? route.query.kind[0] : route.query.kind) || ''
const kindFilter = ref<GigKind | ''>(kindParam === 'role' || kindParam === 'offer' ? kindParam : '')
const categoryFilter = ref('')

const categories = computed(() => Array.from(new Set(mockGigs.map((g) => g.category))))

const filtered = computed(() =>
  mockGigs.filter((g) =>
    (!kindFilter.value || g.kind === kindFilter.value)
    && (!categoryFilter.value || g.category === categoryFilter.value),
  ),
)

function daysUntil(dateStr?: string): { text: string; urgent: boolean } | null {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { text: 'Closed', urgent: false }
  if (diff === 0) return { text: 'Closes today', urgent: true }
  if (diff <= 14) return { text: `Closes in ${diff}d`, urgent: true }
  return { text: `Closes in ${Math.ceil(diff / 7)}w`, urgent: false }
}
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <!-- V3 header -->
    <SiteHeader />

    <!-- HERO -->
    <section class="relative">
      <div class="max-w-4xl mx-auto px-4 pt-12 pb-8 text-center">
        <div class="text-sm tracking-widest uppercase mb-3" style="color:#9a5614;">The opportunity board</div>
        <h1 class="text-5xl sm:text-6xl leading-[0.98]" style="color:#3b1f0d;">
          Get booked. <em class="italic" style="color:#dc2626;">Book talent.</em>
        </h1>
        <p class="mt-5 text-base sm:text-lg leading-relaxed max-w-xl mx-auto" style="color:#5b3a1d;">
          Open roles at festivals and events — and artists offering their services. Post what you need, or what you do.
        </p>

        <div class="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider"
            style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow: 0 4px 0 -1px #b91c1c;"
          >
            <Plus class="w-4 h-4" /> Post a gig
          </button>
        </div>

        <!-- Kind toggle -->
        <div class="mt-8 inline-flex rounded-full p-1" style="background:white; border:1px solid #3b1f0d22;">
          <button
            v-for="opt in [{ v: '', label: 'All' }, { v: 'role', label: 'Open roles' }, { v: 'offer', label: 'Services offered' }]"
            :key="opt.v"
            type="button"
            class="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
            :style="kindFilter === opt.v
              ? { background: '#3b1f0d', color: '#fbf5ea' }
              : { background: 'transparent', color: '#5b3a1d' }"
            @click="kindFilter = opt.v as GigKind | ''"
          >
            {{ opt.label }}
          </button>
        </div>

        <!-- Category chips -->
        <div class="flex flex-wrap items-center justify-center gap-2 mt-4">
          <button
            v-for="cat in categories"
            :key="cat"
            type="button"
            class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
            :style="categoryFilter === cat
              ? { background: '#dc2626', color: 'white', boxShadow: '0 2px 0 -1px #dc2626' }
              : { background: 'white', color: '#9a5614', border: '1px solid #3b1f0d22' }"
            @click="categoryFilter = categoryFilter === cat ? '' : cat"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <svg class="block w-full h-10" viewBox="0 0 1440 60" preserveAspectRatio="none">
        <path d="M0,40 Q360,0 720,30 T1440,20 V60 H0 Z" fill="#3b1f0d" opacity="0.08"/>
      </svg>
    </section>

    <!-- BOARD -->
    <section class="max-w-4xl mx-auto px-4 pb-16">
      <div class="flex items-baseline justify-between mb-6">
        <h2 class="text-2xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
          {{ kindFilter === 'role' ? 'Open roles' : kindFilter === 'offer' ? 'Services offered' : 'All gigs' }}
        </h2>
        <span class="text-xs" style="color:#9a5614; font-family:'Caveat', cursive; font-size:18px;">
          — {{ filtered.length }} gig{{ filtered.length === 1 ? '' : 's' }}
        </span>
      </div>

      <div v-if="!filtered.length" class="text-center py-14 rounded-2xl border-2 border-dashed" style="border-color:#3b1f0d33; background:rgba(255,255,255,0.5);">
        <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">No gigs match your filters yet.</p>
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2">
        <div
          v-for="g in filtered"
          :key="g.id"
          class="rounded-2xl bg-white border p-5 flex flex-col transition-all hover:-translate-y-1"
          :style="{ borderColor: g.accent + '55', boxShadow: '0 1px 0 ' + g.accent + '22, 0 8px 22px rgba(59,31,18,0.05)' }"
        >
          <!-- Kind + category -->
          <div class="flex items-center justify-between gap-2 mb-2">
            <span
              class="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
              :style="g.kind === 'role'
                ? { background: '#dc262618', color: '#dc2626' }
                : { background: '#16a34a18', color: '#16a34a' }"
            >
              <component :is="g.kind === 'role' ? Megaphone : Hand" class="w-3 h-3" />
              {{ g.kind === 'role' ? 'Wanted' : 'Offering' }}
            </span>
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" :style="{ background: g.accent + '18', color: g.accent }">
              {{ g.category }}
            </span>
          </div>

          <h3 class="text-lg font-bold leading-tight" style="color:#3b1f0d; font-family:'Playfair Display', serif;">
            {{ g.title }}
          </h3>

          <!-- Poster -->
          <div class="mt-1 text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            <NuxtLink v-if="g.href" :to="g.href" class="font-bold hover:underline" :style="{ color: g.accent }">
              {{ g.posterName }}
            </NuxtLink>
            <span v-else class="font-bold" :style="{ color: g.accent }">{{ g.posterName }}</span>
            <span style="color:#9a5614;"> · {{ g.posterType }}</span>
          </div>

          <!-- Meta -->
          <div class="mt-3 grid gap-1 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            <span class="inline-flex items-center gap-1.5"><MapPin class="w-3 h-3" style="color:#9a5614;" /> {{ g.location }}</span>
            <span class="inline-flex items-center gap-1.5"><Calendar class="w-3 h-3" style="color:#9a5614;" /> {{ g.when }}</span>
            <span class="inline-flex items-center gap-1.5"><Wallet class="w-3 h-3" style="color:#9a5614;" /> {{ g.compensation }}</span>
          </div>

          <!-- Styles -->
          <div class="mt-3 flex flex-wrap gap-1.5">
            <span
              v-for="s in g.styles"
              :key="s"
              class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              :style="{ background: g.accent + '14', color: g.accent }"
            >{{ s }}</span>
          </div>

          <!-- Footer -->
          <div class="mt-auto pt-4 flex items-center justify-between gap-3">
            <span
              v-if="daysUntil(g.deadline)"
              class="text-xs font-bold"
              :style="{ color: daysUntil(g.deadline)!.urgent ? '#dc2626' : '#9a5614', fontFamily: 'system-ui, sans-serif' }"
            >
              {{ daysUntil(g.deadline)!.text }}
            </span>
            <span v-else />
            <button
              type="button"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-bold uppercase tracking-wider"
              :style="{ background: g.accent, boxShadow: '0 3px 0 -1px ' + g.accent + 'cc' }"
            >
              {{ g.kind === 'role' ? 'Apply' : 'Contact' }} <ArrowRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <footer class="border-t py-6 text-center text-xs" style="border-color:#3b1f0d22; color:#9a5614; font-family:'Caveat', cursive; font-size:18px;">
      WeDance · <NuxtLink to="/artists" class="underline">artists</NuxtLink> · <NuxtLink to="/festivals" class="underline">festivals</NuxtLink> · <NuxtLink to="/organizers" class="underline">for organizers</NuxtLink>
    </footer>
  </div>
</template>
