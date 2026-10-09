<script setup lang="ts">
import type { YearPlanFestival, DanceRole } from '~/types/festival'
import { UserPlus, Check, Calendar, MapPin, ChevronRight, Heart, Gift, ArrowRight } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'

const props = defineProps<{
  sharer: { name: string; photo: string; role: DanceRole }
  festivals: YearPlanFestival[]
  viewerFestivalSlugs: string[]
  referralCode?: string
}>()

const emit = defineEmits<{
  'add-friend': []
  'open-festival': [slug: string]
  'create-year-plan': []
  'sign-in': []
}>()

const friendAdded = ref(false)

function addFriend() {
  // Don't claim success locally — the parent owns the real action (join to
  // connect). friendAdded flips only once that actually completes.
  emit('add-friend')
}

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

// Overlap: festivals the viewer is also attending
const overlapSlugs = computed(() => {
  const sharerSlugs = new Set(props.festivals.map((f) => f.slug))
  return props.viewerFestivalSlugs.filter((s) => sharerSlugs.has(s))
})

const totalWorkshops = computed(() => props.festivals.reduce((sum, f) => sum + f.workshopCount, 0))
const totalLooking = computed(() => props.festivals.reduce((sum, f) => sum + f.lookingCount, 0))

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
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8 space-y-6">
    <!-- Sharer profile card -->
    <div class="rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-6 text-center space-y-4">
      <img
        :src="sharer.photo"
        :alt="sharer.name"
        class="w-16 h-16 rounded-full object-cover mx-auto border-2 border-primary/20"
      />
      <div>
        <h2 class="text-lg font-semibold">{{ sharer.name }}'s 2026 Dance Year</h2>
        <div class="flex items-center justify-center gap-2 mt-2">
          <Badge variant="secondary">{{ sharer.role === 'lead' ? 'Lead' : 'Follow' }}</Badge>
          <Badge variant="outline">{{ festivals.length }} festivals</Badge>
          <Badge variant="outline">{{ totalWorkshops }} workshops</Badge>
          <Badge v-if="totalLooking > 0" variant="outline" class="bg-orange-50 text-orange-600 border-orange-200">
            {{ totalLooking }} needs partner
          </Badge>
        </div>
      </div>

      <!-- Add friend button -->
      <Button
        v-if="!friendAdded"
        variant="outline"
        class="mx-auto"
        @click="addFriend"
      >
        <UserPlus class="w-4 h-4 mr-2" />
        Add {{ sharer.name }} as friend
      </Button>
      <Button
        v-else
        variant="outline"
        class="mx-auto"
        disabled
      >
        <Check class="w-4 h-4 mr-2" />
        Friend added
      </Button>
    </div>

    <!-- Overlap banner -->
    <div v-if="overlapSlugs.length > 0" class="rounded-lg border bg-blue-50 border-blue-200 p-4 flex items-center gap-3">
      <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
        <Calendar class="w-4 h-4 text-blue-600" />
      </div>
      <div>
        <p class="text-sm font-medium text-blue-800">
          You overlap on {{ overlapSlugs.length }} {{ overlapSlugs.length === 1 ? 'festival' : 'festivals' }}!
        </p>
        <p class="text-xs text-blue-700">You and {{ sharer.name }} are going to the same events.</p>
      </div>
    </div>

    <!-- Festival timeline -->
    <div class="space-y-6">
      <h3 class="text-base font-semibold">Their Festivals</h3>

      <div v-for="[month, monthFestivals] in groupedByMonth" :key="month">
        <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{{ month }}</p>

        <div class="space-y-3">
          <div
            v-for="f in monthFestivals"
            :key="f.slug"
            class="rounded-xl border-2 overflow-hidden"
            :style="{ borderColor: f.accentColor + '30' }"
          >
            <!-- Festival header -->
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
                <h4 class="text-sm font-semibold leading-tight">{{ f.name }}</h4>
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
            </div>

            <!-- Details -->
            <div class="px-4 py-3 space-y-2.5 border-t" :style="{ borderColor: f.accentColor + '15' }">
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
                <Badge
                  v-if="viewerFestivalSlugs.includes(f.slug)"
                  variant="outline"
                  class="text-xs bg-blue-50 text-blue-600 border-blue-200"
                >
                  You're going too!
                </Badge>
              </div>

              <!-- Referral hint (only for festivals where sharer has a ticket and referral code is present) -->
              <div v-if="f.ticketStatus === 'purchased' && referralCode" class="rounded-md border border-dashed border-green-200 bg-green-50 p-2.5 flex items-center gap-2">
                <Gift class="w-3.5 h-3.5 text-green-600 shrink-0" />
                <p class="text-xs text-green-700">
                  Buy your ticket through {{ sharer.name }}'s link — you both get 10% off.
                </p>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  class="text-xs"
                  @click="emit('open-festival', f.slug)"
                >
                  See plan
                  <ChevronRight class="w-3 h-3 ml-1" />
                </Button>
                <Button
                  v-if="f.lookingCount > 0"
                  size="sm"
                  variant="outline"
                  class="text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                  @click="emit('open-festival', f.slug)"
                >
                  <Heart class="w-3 h-3 mr-1" />
                  Be their partner
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CTA: Create your own year plan -->
    <div class="rounded-xl border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-6 text-center space-y-3">
      <Calendar class="w-8 h-8 text-primary mx-auto" />
      <h3 class="text-base font-semibold">Plan your own dance year</h3>
      <p class="text-sm text-muted-foreground">
        Browse festivals, pick workshops, find partners, and share your year with friends.
      </p>
      <Button @click="emit('create-year-plan')">
        Create my year plan
        <ArrowRight class="w-4 h-4 ml-1.5" />
      </Button>
    </div>
  </div>
</template>
