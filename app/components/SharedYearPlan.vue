<script setup lang="ts">
import type { YearPlanFestival, DanceRole } from '~/types/festival'
import { UserPlus, Check, Calendar, MapPin, ChevronRight, Heart, Gift, ArrowRight } from 'lucide-vue-next'

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
    <div class="rounded-xl border-2 border-dashed p-6 text-center space-y-4" style="border-color:#dc262644; background:rgba(255,255,255,0.8);">
      <img
        :src="sharer.photo"
        :alt="sharer.name"
        class="w-16 h-16 rounded-full object-cover mx-auto border-2"
        style="border-color:#dc262644;"
      />
      <div>
        <h2 class="text-xl font-bold" style="font-family:'Playfair Display', serif; color:#3b1f0d;">{{ sharer.name }}'s 2026 Dance Year</h2>
        <div class="flex items-center justify-center gap-2 mt-2 flex-wrap">
          <span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium" style="border-color:#3b1f0d22; color:#3b1f0d; background:rgba(251,245,234,0.8);">{{ sharer.role === 'lead' ? 'Lead' : 'Follow' }}</span>
          <span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium" style="border-color:#3b1f0d22; color:#9a5614;">{{ festivals.length }} festivals</span>
          <span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium" style="border-color:#3b1f0d22; color:#9a5614;">{{ totalWorkshops }} workshops</span>
          <span v-if="totalLooking > 0" class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium" style="border-color:#f59e0b55; color:#92400e; background:rgba(245, 158, 11, 0.08);">
            {{ totalLooking }} needs partner
          </span>
        </div>
      </div>

      <!-- Add friend button -->
      <button
        v-if="!friendAdded"
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-xs font-bold uppercase tracking-wider mx-auto"
        style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow: 0 4px 0 -1px #b91c1c;"
        @click="addFriend"
      >
        <UserPlus class="w-4 h-4" />
        Add {{ sharer.name }} as friend
      </button>
      <button
        v-else
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider mx-auto opacity-60 cursor-default"
        style="border: 2px dashed #3b1f0d44; color:#3b1f0d;"
        disabled
      >
        <Check class="w-4 h-4" />
        Friend added
      </button>
    </div>

    <!-- Overlap banner -->
    <div v-if="overlapSlugs.length > 0" class="rounded-xl border-2 border-dashed p-4 flex items-center gap-3" style="border-color:#0891b2; background:rgba(8, 145, 178, 0.06);">
      <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style="background:rgba(8, 145, 178, 0.12);">
        <Calendar class="w-4 h-4" style="color:#0891b2;" />
      </div>
      <div>
        <p class="text-sm font-bold" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
          You overlap on {{ overlapSlugs.length }} {{ overlapSlugs.length === 1 ? 'festival' : 'festivals' }}!
        </p>
        <p class="text-xs" style="color:#5b3a1d;">You and {{ sharer.name }} are going to the same events.</p>
      </div>
    </div>

    <!-- Festival timeline -->
    <div class="space-y-6">
      <h3 class="text-lg font-bold" style="font-family:'Playfair Display', serif; color:#3b1f0d;">Their Festivals</h3>

      <div v-for="[month, monthFestivals] in groupedByMonth" :key="month">
        <p class="text-[10px] uppercase tracking-[0.2em] font-bold mb-3" style="color:#9a5614;">{{ month }}</p>

        <div class="space-y-3">
          <div
            v-for="f in monthFestivals"
            :key="f.slug"
            class="rounded-xl border-2 overflow-hidden"
            :style="{ borderColor: f.accentColor + '55', boxShadow: '3px 4px 0 -1px ' + f.accentColor + '2e' }"
            style="background:rgba(255,255,255,0.85);"
          >
            <!-- Festival header -->
            <div
              class="px-4 py-3 flex items-center gap-3"
              :style="{ background: f.accentColor + '0d' }"
            >
              <img
                :src="f.logo"
                :alt="f.name"
                class="w-10 h-10 rounded-lg object-cover shrink-0"
              />
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-bold leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">{{ f.name }}</h4>
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
            </div>

            <!-- Details -->
            <div class="px-4 py-3 space-y-2.5 border-t" :style="{ borderColor: f.accentColor + '22' }">
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
                <span
                  v-if="viewerFestivalSlugs.includes(f.slug)"
                  class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
                  style="border-color:#0891b255; color:#0891b2; background:rgba(8, 145, 178, 0.06);"
                >
                  You're going too!
                </span>
              </div>

              <!-- Referral hint -->
              <div v-if="f.ticketStatus === 'purchased' && referralCode && f.referralDiscountPercent" class="rounded-lg border-2 border-dashed p-2.5 flex items-center gap-2" style="border-color:#16a34a55; background:rgba(22, 163, 74, 0.06);">
                <Gift class="w-3.5 h-3.5 shrink-0" style="color:#16a34a;" />
                <p class="text-xs" style="color:#15803d;">
                  Buy your ticket through {{ sharer.name }}'s link — you both get {{ f.referralDiscountPercent }}% off.
                </p>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-2">
                <button
                  class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border-2 border-dashed hover:-translate-y-0.5 transition-transform"
                  style="border-color:#3b1f0d33; color:#3b1f0d;"
                  @click="emit('open-festival', f.slug)"
                >
                  See plan
                  <ChevronRight class="w-3 h-3" />
                </button>
                <button
                  v-if="f.lookingCount > 0"
                  class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border-2 border-dashed hover:-translate-y-0.5 transition-transform"
                  style="border-color:#f59e0b55; color:#92400e;"
                  @click="emit('open-festival', f.slug)"
                >
                  <Heart class="w-3 h-3" />
                  Be their partner
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CTA: Create your own year plan -->
    <div class="rounded-xl border-2 border-dashed p-6 text-center space-y-3" style="border-color:#dc262644; background:rgba(255,255,255,0.8);">
      <Calendar class="w-8 h-8 mx-auto" style="color:#dc2626;" />
      <h3 class="text-lg font-bold" style="font-family:'Playfair Display', serif; color:#3b1f0d;">Plan your own dance year</h3>
      <p class="text-sm" style="color:#5b3a1d;">
        Browse festivals, pick workshops, find partners, and share your year with friends.
      </p>
      <button
        class="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider"
        style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow: 0 4px 0 -1px #b91c1c;"
        @click="emit('create-year-plan')"
      >
        Create my year plan
        <ArrowRight class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
