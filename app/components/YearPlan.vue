<script setup lang="ts">
import type { YearPlanFestival, YearStats } from '~/types/festival'
import { Calendar, MapPin, Users, Ticket, Clock, ChevronRight, Share2, Sparkles } from 'lucide-vue-next'

const props = defineProps<{
  festivals: YearPlanFestival[]
  suggestions: YearPlanFestival[]
  stats: YearStats
  isSignedIn: boolean
}>()

const emit = defineEmits<{
  'open-festival': [slug: string]
  'share': []
  'sign-in': []
}>()

// Group festivals by month
const groupedByMonth = computed(() => {
  const months = new Map<string, YearPlanFestival[]>()
  for (const f of props.festivals) {
    const date = new Date(f.startDate)
    const key = date.toLocaleString('en', { month: 'long', year: 'numeric' })
    const list = months.get(key) || []
    list.push(f)
    months.set(key, list)
  }
  return months
})

// Upcoming ticket deadlines
const upcomingDeadlines = computed(() => {
  const now = new Date()
  return props.festivals
    .filter((f) => f.earlyBirdDeadline && new Date(f.earlyBirdDeadline) > now)
    .sort((a, b) => new Date(a.earlyBirdDeadline!).getTime() - new Date(b.earlyBirdDeadline!).getTime())
    .slice(0, 3)
})

function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const sMonth = s.toLocaleString('en', { month: 'short' })
  const eMonth = e.toLocaleString('en', { month: 'short' })
  if (sMonth === eMonth) {
    return `${sMonth} ${s.getDate()}–${e.getDate()}`
  }
  return `${sMonth} ${s.getDate()} – ${eMonth} ${e.getDate()}`
}

function daysUntil(date: string): number {
  const now = new Date()
  const target = new Date(date)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

const ticketStatusLabel: Record<string, string> = {
  'purchased': 'Ticket purchased',
  'not-purchased': 'No ticket yet',
  'sold-out': 'Sold out',
}

const ticketStatusClass: Record<string, string> = {
  'purchased': 'bg-green-50 text-green-700 border-green-200',
  'not-purchased': 'bg-orange-50 text-orange-700 border-orange-200',
  'sold-out': 'bg-red-50 text-red-700 border-red-200',
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8 space-y-8">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl sm:text-3xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">My 2026 Dance Year</h1>
        <p class="text-sm mt-1" style="color:#9a5614;">
          {{ stats.totalFestivals }} festivals · {{ stats.totalWorkshops }} workshops · {{ stats.countries.length }} {{ stats.countries.length === 1 ? 'country' : 'countries' }}
        </p>
      </div>
      <button
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border-2 border-dashed hover:-translate-y-0.5 transition-transform"
        style="border-color:#3b1f0d44; color:#3b1f0d;"
        @click="emit('share')"
      >
        <Share2 class="w-3.5 h-3.5" />
        Share
      </button>
    </div>

    <!-- Ticket deadline alerts -->
    <div v-if="upcomingDeadlines.length > 0" class="space-y-2">
      <div
        v-for="f in upcomingDeadlines"
        :key="f.slug + '-deadline'"
        class="rounded-xl border-2 border-dashed p-3 flex items-center gap-3 cursor-pointer hover:-translate-y-0.5 transition-transform"
        style="border-color:#f59e0b; background:rgba(245, 158, 11, 0.08);"
        @click="emit('open-festival', f.slug)"
      >
        <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style="background:rgba(245, 158, 11, 0.15);">
          <Clock class="w-4 h-4" style="color:#f59e0b;" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold" style="color:#3b1f0d; font-family:'Playfair Display', serif;">Early bird for {{ f.name }}</p>
          <p class="text-xs" style="color:#9a5614;">Expires in {{ daysUntil(f.earlyBirdDeadline!) }} days</p>
        </div>
        <ChevronRight class="w-4 h-4 shrink-0" style="color:#f59e0b;" />
      </div>
    </div>

    <!-- Festival timeline -->
    <div class="space-y-6">
      <div v-for="[month, monthFestivals] in groupedByMonth" :key="month">
        <p class="text-[10px] uppercase tracking-[0.2em] font-bold mb-3" style="color:#9a5614;">{{ month }}</p>

        <div class="space-y-3">
          <div
            v-for="f in monthFestivals"
            :key="f.slug"
            class="rounded-xl border-2 overflow-hidden cursor-pointer hover:-translate-y-0.5 transition-all"
            :style="{ borderColor: f.accentColor + '55', boxShadow: '3px 4px 0 -1px ' + f.accentColor + '2e' }"
            style="background:rgba(255,255,255,0.85);"
            @click="emit('open-festival', f.slug)"
          >
            <!-- Festival header with accent -->
            <div
              class="px-4 py-3 flex items-center gap-3"
              :style="{ background: f.accentColor + '0d' }"
            >
              <img
                v-if="f.logo"
                :src="f.logo"
                :alt="f.name"
                class="w-10 h-10 rounded-lg object-cover shrink-0"
              />
              <div
                v-else
                class="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0"
                :style="{ background: f.accentColor || '#9a5614' }"
              >
                {{ f.name.charAt(0) }}
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-bold leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">{{ f.name }}</h3>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-xs flex items-center gap-1" style="color:#9a5614;">
                    <Calendar class="w-3 h-3" />
                    {{ formatDateRange(f.startDate, f.endDate) }}
                  </span>
                  <span class="text-xs flex items-center gap-1" style="color:#9a5614;">
                    <MapPin class="w-3 h-3" />
                    {{ f.location }}
                  </span>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 shrink-0" style="color:#9a5614;" />
            </div>

            <!-- Festival details -->
            <div class="px-4 py-3 space-y-2.5 border-t" :style="{ borderColor: f.accentColor + '22' }">
              <!-- Plan stats -->
              <div class="flex items-center gap-2 flex-wrap">
                <span v-if="f.workshopCount > 0" class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium" style="border-color:#3b1f0d22; color:#3b1f0d; background:rgba(251,245,234,0.8);">
                  {{ f.workshopCount }} workshops
                </span>
                <span v-if="f.workshopCount === 0" class="inline-flex items-center rounded-full border border-dashed px-2 py-0.5 text-xs italic" style="border-color:#3b1f0d22; color:#9a5614;">
                  Plan not started
                </span>
                <span v-if="f.role" class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium" style="border-color:#3b1f0d22; color:#3b1f0d; background:rgba(251,245,234,0.8);">
                  {{ f.role === 'lead' ? 'Lead' : 'Follow' }}
                </span>
                <span
                  v-if="f.lookingCount > 0"
                  class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
                  style="border-color:#f59e0b55; color:#92400e; background:rgba(245, 158, 11, 0.08);"
                >
                  {{ f.lookingCount }} need partner
                </span>
              </div>

              <!-- Ticket status -->
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
                  :class="ticketStatusClass[f.ticketStatus]"
                >
                  <Ticket class="w-3 h-3 mr-1" />
                  {{ f.ticketName || ticketStatusLabel[f.ticketStatus] }}
                </span>
              </div>

              <!-- Styles -->
              <div v-if="f.styles.length > 0" class="flex flex-wrap gap-1">
                <span
                  v-for="style in f.styles"
                  :key="style"
                  class="inline-flex items-center rounded-full border px-1.5 py-0 text-[10px]"
                  style="border-color:#3b1f0d15; color:#9a5614;"
                >
                  {{ style }}
                </span>
              </div>

              <!-- Friends going -->
              <div v-if="f.friendsGoing.length > 0" class="flex items-center gap-2">
                <div class="flex -space-x-2">
                  <img
                    v-for="friend in f.friendsGoing.slice(0, 5)"
                    :key="friend.name"
                    :src="friend.photo"
                    :alt="friend.name"
                    class="w-6 h-6 rounded-full border-2 object-cover"
                    style="border-color:#fbf5ea;"
                  />
                </div>
                <span class="text-xs" style="color:#9a5614;">
                  {{ f.friendsGoing.map((fr) => fr.name.split(' ')[0]).slice(0, 3).join(', ') }}
                  <template v-if="f.friendsGoing.length > 3">
                    +{{ f.friendsGoing.length - 3 }} more
                  </template>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Suggestions -->
    <div v-if="suggestions.length > 0" class="space-y-3">
      <div class="flex items-center gap-2">
        <Sparkles class="w-4 h-4" style="color:#9a5614;" />
        <h3 class="text-sm font-bold" style="color:#9a5614; font-family:'Playfair Display', serif;">Suggested for you</h3>
      </div>

      <div
        v-for="f in suggestions"
        :key="f.slug"
        class="rounded-xl border-2 border-dashed p-4 cursor-pointer hover:-translate-y-0.5 transition-transform"
        style="border-color:#3b1f0d22; background:rgba(255,255,255,0.7);"
        @click="emit('open-festival', f.slug)"
      >
        <div class="flex items-center gap-3">
          <img
            v-if="f.logo"
            :src="f.logo"
            :alt="f.name"
            class="w-10 h-10 rounded-lg object-cover shrink-0"
          />
          <div
            v-else
            class="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0"
            :style="{ background: f.accentColor || '#9a5614' }"
          >
            {{ f.name.charAt(0) }}
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-bold" style="font-family:'Playfair Display', serif; color:#3b1f0d;">{{ f.name }}</h4>
            <p class="text-xs" style="color:#9a5614;">
              {{ formatDateRange(f.startDate, f.endDate) }} · {{ f.location }}
            </p>
          </div>
          <ChevronRight class="w-4 h-4 shrink-0" style="color:#9a5614;" />
        </div>
        <div class="mt-2 flex items-center gap-3">
          <span v-if="f.friendsGoing.length > 0" class="text-xs flex items-center gap-1" style="color:#9a5614;">
            <Users class="w-3 h-3" />
            {{ f.friendsGoing.length }} {{ f.friendsGoing.length === 1 ? 'friend' : 'friends' }} going
          </span>
          <span v-if="f.styles.length > 0" class="text-xs" style="color:#9a5614;">
            {{ f.styles.join(', ') }}
          </span>
        </div>
      </div>
    </div>

    <!-- Year stats -->
    <div class="rounded-xl border-2 border-dashed p-5 space-y-4" style="border-color:#3b1f0d22; background:rgba(255,255,255,0.7);">
      <h3 class="text-base font-bold" style="font-family:'Playfair Display', serif; color:#3b1f0d;">My Year in Numbers</h3>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; text-align: center;">
        <div>
          <p class="text-3xl font-black" style="font-family:'Playfair Display', serif; color:#dc2626;">{{ stats.totalFestivals }}</p>
          <p class="text-[10px] uppercase tracking-[0.2em]" style="color:#9a5614;">Festivals</p>
        </div>
        <div>
          <p class="text-3xl font-black" style="font-family:'Playfair Display', serif; color:#16a34a;">{{ stats.totalWorkshops }}</p>
          <p class="text-[10px] uppercase tracking-[0.2em]" style="color:#9a5614;">Workshops</p>
        </div>
        <div>
          <p class="text-3xl font-black" style="font-family:'Playfair Display', serif; color:#0891b2;">{{ stats.countries.length }}</p>
          <p class="text-[10px] uppercase tracking-[0.2em]" style="color:#9a5614;">Countries</p>
        </div>
      </div>

      <!-- Style breakdown -->
      <div class="space-y-1.5">
        <p class="text-xs font-bold" style="color:#9a5614;">Dance styles</p>
        <div v-for="entry in stats.topStyles" :key="entry.style" class="flex items-center gap-2">
          <span class="text-xs w-16 shrink-0" style="color:#5b3a1d; font-family: system-ui, sans-serif;">{{ entry.style }}</span>
          <div class="flex-1 h-2 rounded-full overflow-hidden" style="background:#3b1f0d15;">
            <div
              class="h-full rounded-full"
              :style="{ width: entry.percent + '%', background: 'linear-gradient(135deg, #dc2626, #f97316)' }"
            />
          </div>
          <span class="text-[10px] w-8 text-right" style="color:#9a5614;">{{ entry.percent }}%</span>
        </div>
      </div>

      <!-- Partner match rate -->
      <div class="flex items-center justify-between text-xs">
        <span style="color:#9a5614;">Partner match rate</span>
        <span class="font-bold" style="color:#3b1f0d;">{{ stats.partnerMatchRate }}%</span>
      </div>
    </div>

    <!-- Not signed in CTA -->
    <div v-if="!isSignedIn" class="rounded-xl border-2 border-dashed p-6 text-center space-y-3" style="border-color:#dc262644; background:rgba(255,255,255,0.8);">
      <Calendar class="w-8 h-8 mx-auto" style="color:#dc2626;" />
      <h3 class="text-lg font-bold" style="font-family:'Playfair Display', serif; color:#3b1f0d;">Track your dance year</h3>
      <p class="text-sm" style="color:#5b3a1d;">
        Sign in to save your plans across festivals and share your year with friends.
      </p>
      <button
        class="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider"
        style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow: 0 4px 0 -1px #b91c1c;"
        @click="emit('sign-in')"
      >Sign in</button>
    </div>
  </div>
</template>
