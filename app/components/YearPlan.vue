<script setup lang="ts">
import type { YearPlanFestival, YearStats } from '~/types/festival'
import { Calendar, MapPin, Users, Ticket, Clock, ChevronRight, Share2, Sparkles, AlertCircle } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'

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
        <h1 class="text-xl font-bold">My 2026 Dance Year</h1>
        <p class="text-sm text-muted-foreground mt-0.5">
          {{ stats.totalFestivals }} festivals · {{ stats.totalWorkshops }} workshops · {{ stats.countries.length }} {{ stats.countries.length === 1 ? 'country' : 'countries' }}
        </p>
      </div>
      <Button variant="outline" size="sm" @click="emit('share')">
        <Share2 class="w-3.5 h-3.5 mr-1.5" />
        Share
      </Button>
    </div>

    <!-- Ticket deadline alerts -->
    <div v-if="upcomingDeadlines.length > 0" class="space-y-2">
      <div
        v-for="f in upcomingDeadlines"
        :key="f.slug + '-deadline'"
        class="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center gap-3 cursor-pointer hover:bg-amber-100/80 transition-colors"
        @click="emit('open-festival', f.slug)"
      >
        <div class="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <Clock class="w-4 h-4 text-amber-600" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-amber-900">Early bird for {{ f.name }}</p>
          <p class="text-xs text-amber-700">Expires in {{ daysUntil(f.earlyBirdDeadline!) }} days</p>
        </div>
        <ChevronRight class="w-4 h-4 text-amber-400 shrink-0" />
      </div>
    </div>

    <!-- Festival timeline -->
    <div class="space-y-6">
      <div v-for="[month, monthFestivals] in groupedByMonth" :key="month">
        <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{{ month }}</p>

        <div class="space-y-3">
          <div
            v-for="f in monthFestivals"
            :key="f.slug"
            class="rounded-xl border-2 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            :style="{ borderColor: f.accentColor + '30' }"
            @click="emit('open-festival', f.slug)"
          >
            <!-- Festival header with accent -->
            <div
              class="px-4 py-3 flex items-center gap-3"
              :style="{ background: f.accentColor + '08' }"
            >
              <img
                :src="f.logo"
                :alt="f.name"
                class="w-10 h-10 rounded-lg object-cover shrink-0"
              />
              <div class="flex-1 min-w-0">
                <h3 class="text-sm font-semibold leading-tight">{{ f.name }}</h3>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar class="w-3 h-3" />
                    {{ formatDateRange(f.startDate, f.endDate) }}
                  </span>
                  <span class="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin class="w-3 h-3" />
                    {{ f.location }}
                  </span>
                </div>
              </div>
              <ChevronRight class="w-4 h-4 text-muted-foreground shrink-0" />
            </div>

            <!-- Festival details -->
            <div class="px-4 py-3 space-y-2.5 border-t" :style="{ borderColor: f.accentColor + '15' }">
              <!-- Plan stats -->
              <div class="flex items-center gap-2 flex-wrap">
                <Badge v-if="f.workshopCount > 0" variant="secondary" class="text-xs">
                  {{ f.workshopCount }} workshops
                </Badge>
                <Badge v-if="f.workshopCount === 0" variant="outline" class="text-xs text-muted-foreground">
                  Plan not started
                </Badge>
                <Badge v-if="f.role" variant="secondary" class="text-xs">
                  {{ f.role === 'lead' ? 'Lead' : 'Follow' }}
                </Badge>
                <Badge
                  v-if="f.lookingCount > 0"
                  variant="outline"
                  class="text-xs bg-orange-50 text-orange-600 border-orange-200"
                >
                  {{ f.lookingCount }} need partner
                </Badge>
              </div>

              <!-- Ticket status -->
              <div class="flex items-center gap-2">
                <Badge
                  variant="outline"
                  class="text-xs"
                  :class="ticketStatusClass[f.ticketStatus]"
                >
                  <Ticket class="w-3 h-3 mr-1" />
                  {{ f.ticketName || ticketStatusLabel[f.ticketStatus] }}
                </Badge>
              </div>

              <!-- Styles -->
              <div v-if="f.styles.length > 0" class="flex flex-wrap gap-1">
                <Badge
                  v-for="style in f.styles"
                  :key="style"
                  variant="outline"
                  class="text-[10px] px-1.5 py-0 text-muted-foreground"
                >
                  {{ style }}
                </Badge>
              </div>

              <!-- Friends going -->
              <div v-if="f.friendsGoing.length > 0" class="flex items-center gap-2">
                <div class="flex -space-x-2">
                  <img
                    v-for="friend in f.friendsGoing.slice(0, 5)"
                    :key="friend.name"
                    :src="friend.photo"
                    :alt="friend.name"
                    class="w-6 h-6 rounded-full border-2 border-background object-cover"
                  />
                </div>
                <span class="text-xs text-muted-foreground">
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
        <Sparkles class="w-4 h-4 text-muted-foreground" />
        <h3 class="text-sm font-semibold text-muted-foreground">Suggested for you</h3>
      </div>

      <div
        v-for="f in suggestions"
        :key="f.slug"
        class="rounded-xl border border-dashed p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        @click="emit('open-festival', f.slug)"
      >
        <div class="flex items-center gap-3">
          <img
            :src="f.logo"
            :alt="f.name"
            class="w-10 h-10 rounded-lg object-cover shrink-0"
          />
          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-medium">{{ f.name }}</h4>
            <p class="text-xs text-muted-foreground">
              {{ formatDateRange(f.startDate, f.endDate) }} · {{ f.location }}
            </p>
          </div>
          <ChevronRight class="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
        <div class="mt-2 flex items-center gap-3">
          <span v-if="f.friendsGoing.length > 0" class="text-xs text-muted-foreground flex items-center gap-1">
            <Users class="w-3 h-3" />
            {{ f.friendsGoing.length }} {{ f.friendsGoing.length === 1 ? 'friend' : 'friends' }} going
          </span>
          <span v-if="f.styles.length > 0" class="text-xs text-muted-foreground">
            {{ f.styles.join(', ') }}
          </span>
        </div>
      </div>
    </div>

    <!-- Year stats -->
    <div class="rounded-xl border bg-muted/30 p-5 space-y-4">
      <h3 class="text-sm font-semibold">My Year in Numbers</h3>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; text-align: center;">
        <div>
          <p class="text-2xl font-bold">{{ stats.totalFestivals }}</p>
          <p class="text-[10px] text-muted-foreground uppercase tracking-wider">Festivals</p>
        </div>
        <div>
          <p class="text-2xl font-bold">{{ stats.totalWorkshops }}</p>
          <p class="text-[10px] text-muted-foreground uppercase tracking-wider">Workshops</p>
        </div>
        <div>
          <p class="text-2xl font-bold">{{ stats.countries.length }}</p>
          <p class="text-[10px] text-muted-foreground uppercase tracking-wider">Countries</p>
        </div>
      </div>

      <!-- Style breakdown -->
      <div class="space-y-1.5">
        <p class="text-xs font-medium text-muted-foreground">Dance styles</p>
        <div v-for="entry in stats.topStyles" :key="entry.style" class="flex items-center gap-2">
          <span class="text-xs w-16 shrink-0">{{ entry.style }}</span>
          <div class="flex-1 h-2 rounded-full overflow-hidden" style="background: hsl(var(--muted));">
            <div
              class="h-full rounded-full"
              :style="{ width: entry.percent + '%', background: 'hsl(var(--primary) / 0.6)' }"
            />
          </div>
          <span class="text-[10px] text-muted-foreground w-8 text-right">{{ entry.percent }}%</span>
        </div>
      </div>

      <!-- Partner match rate -->
      <div class="flex items-center justify-between text-xs">
        <span class="text-muted-foreground">Partner match rate</span>
        <span class="font-medium">{{ stats.partnerMatchRate }}%</span>
      </div>
    </div>

    <!-- Not signed in CTA -->
    <div v-if="!isSignedIn" class="rounded-xl border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-6 text-center space-y-3">
      <Calendar class="w-8 h-8 text-primary mx-auto" />
      <h3 class="text-base font-semibold">Track your dance year</h3>
      <p class="text-sm text-muted-foreground">
        Sign in to save your plans across festivals and share your year with friends.
      </p>
      <Button @click="emit('sign-in')">Sign in</Button>
    </div>
  </div>
</template>
