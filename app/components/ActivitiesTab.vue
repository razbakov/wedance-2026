<script setup lang="ts">
/**
 * ActivitiesTab — rides, rooms, dinners & activities around a festival.
 * V3 tropical style. Collapsible sections; same props/emits as before.
 */
import type { RideShare, GroupDinner, ExtraActivity } from '~/types/festival'
import { Car, BedDouble, UtensilsCrossed, Compass, ChevronDown, Check, MessageCircle } from 'lucide-vue-next'

const props = defineProps<{
  rideShares: RideShare[]
  groupDinners: GroupDinner[]
  extraActivities: ExtraActivity[]
  lookingForRoommate: boolean
  isSignedIn: boolean
}>()

const emit = defineEmits<{
  'join-dinner': [id: string]
  'join-activity': [id: string]
  'post-ride': [ride: { type: 'offering' | 'looking'; originCity: string; date: string; seats?: number }]
  'toggle-roommate': []
  'sign-in': []
}>()

const expandedSections = ref(new Set<string>())
function toggleSection(section: string) {
  const next = new Set(expandedSections.value)
  next.has(section) ? next.delete(section) : next.add(section)
  expandedSections.value = next
}

// Ride form
const rideMode = ref<'offering' | 'looking' | null>(null)
const rideOriginCity = ref('')
const rideDate = ref('')
const rideSeats = ref(2)

function submitRide() {
  if (!rideOriginCity.value || !rideDate.value) return
  emit('post-ride', {
    type: rideMode.value!,
    originCity: rideOriginCity.value,
    date: rideDate.value,
    seats: rideMode.value === 'offering' ? rideSeats.value : undefined,
  })
  rideOriginCity.value = ''
  rideDate.value = ''
  rideSeats.value = 2
  rideMode.value = null
}

const totalEvents = computed(() => props.groupDinners.length + props.extraActivities.length)

// Shared field + button styles (V3)
const fieldClass = 'mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none transition-all'
const fieldStyle = 'background:white; border-color:#3b1f0d33; color:#3b1f0d; font-family: system-ui, sans-serif;'
const labelStyle = 'color:#9a5614; font-family: system-ui, sans-serif;'

// Section definitions drive the accordion headers
const sections = [
  { key: 'rides',   icon: Car,             label: 'Share a ride',        accent: '#0891b2' },
  { key: 'rooms',   icon: BedDouble,       label: 'Share a room',        accent: '#16a34a' },
  { key: 'dinners', icon: UtensilsCrossed, label: 'Dinners & activities', accent: '#f59e0b' },
] as const

function badgeFor(key: string): string | null {
  if (key === 'rides') return props.rideShares.length ? `${props.rideShares.length} sharing` : null
  if (key === 'rooms') return props.lookingForRoommate ? 'Looking' : null
  if (key === 'dinners') return totalEvents.value ? `${totalEvents.value} events` : null
  return null
}
</script>

<template>
  <div class="grid gap-3">
    <div
      v-for="sec in sections"
      :key="sec.key"
      class="rounded-2xl bg-white border overflow-hidden"
      :style="{ borderColor: sec.accent + '55', boxShadow: '0 1px 0 ' + sec.accent + '18, 0 4px 14px rgba(59,31,18,0.04)' }"
    >
      <!-- Header -->
      <button
        type="button"
        class="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        @click="toggleSection(sec.key)"
      >
        <span class="w-8 h-8 rounded-full flex items-center justify-center shrink-0" :style="{ background: sec.accent + '18' }">
          <component :is="sec.icon" class="w-4 h-4" :style="{ color: sec.accent, 'stroke-width': 1.75 }" />
        </span>
        <span class="flex-1 text-base font-bold" style="color:#3b1f0d; font-family:'Playfair Display', serif;">
          {{ sec.label }}
        </span>
        <span
          v-if="badgeFor(sec.key) && !expandedSections.has(sec.key)"
          class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          :style="{ background: sec.accent + '18', color: sec.accent }"
        >
          {{ badgeFor(sec.key) }}
        </span>
        <ChevronDown
          class="w-4 h-4 transition-transform"
          :style="{ color: '#9a5614', transform: expandedSections.has(sec.key) ? 'rotate(180deg)' : 'none' }"
        />
      </button>

      <!-- RIDES -->
      <div v-if="sec.key === 'rides' && expandedSections.has('rides')" class="px-4 pb-4 grid gap-3">
        <div v-if="isSignedIn" class="rounded-xl border p-3 grid gap-2" style="border-color:#3b1f0d15; background:#3b1f0d05;">
          <div class="flex gap-2">
            <button
              type="button"
              class="flex-1 text-xs font-bold py-2 rounded-lg transition-all"
              :style="rideMode === 'offering'
                ? { background: '#0891b2', color: 'white' }
                : { background: 'white', color: '#5b3a1d', border: '1px solid #3b1f0d22' }"
              @click="rideMode = rideMode === 'offering' ? null : 'offering'"
            >Offering a ride</button>
            <button
              type="button"
              class="flex-1 text-xs font-bold py-2 rounded-lg transition-all"
              :style="rideMode === 'looking'
                ? { background: '#0891b2', color: 'white' }
                : { background: 'white', color: '#5b3a1d', border: '1px solid #3b1f0d22' }"
              @click="rideMode = rideMode === 'looking' ? null : 'looking'"
            >Looking for a ride</button>
          </div>

          <div v-if="rideMode" class="grid gap-2">
            <div>
              <label class="text-[10px] font-bold uppercase tracking-widest" :style="labelStyle">From city</label>
              <input v-model="rideOriginCity" type="text" placeholder="e.g. Munich" :class="fieldClass" :style="fieldStyle">
            </div>
            <div>
              <label class="text-[10px] font-bold uppercase tracking-widest" :style="labelStyle">{{ rideMode === 'offering' ? 'Departure date' : 'Preferred date' }}</label>
              <input v-model="rideDate" type="date" :class="fieldClass" :style="fieldStyle">
            </div>
            <div v-if="rideMode === 'offering'">
              <label class="text-[10px] font-bold uppercase tracking-widest" :style="labelStyle">Seats available</label>
              <input v-model.number="rideSeats" type="number" min="1" max="6" :class="fieldClass" :style="fieldStyle">
            </div>
            <button
              type="button"
              class="w-full py-2.5 rounded-full text-white text-xs font-bold uppercase tracking-wider"
              style="background:#0891b2; box-shadow: 0 3px 0 -1px #0e7490;"
              @click="submitRide"
            >Post my ride</button>
          </div>
        </div>
        <div v-else class="rounded-xl border p-3 text-center" style="border-color:#3b1f0d15; background:#3b1f0d05;">
          <p class="text-sm mb-2" style="color:#5b3a1d; font-family: system-ui, sans-serif;">Sign in to share or find a ride</p>
          <button
            type="button"
            class="px-4 py-2 rounded-full text-white text-xs font-bold uppercase tracking-wider"
            style="background:#0891b2; box-shadow: 0 3px 0 -1px #0e7490;"
            @click="emit('sign-in')"
          >Sign in</button>
        </div>

        <div v-if="rideShares.length" class="grid gap-1.5">
          <p class="text-[10px] font-bold uppercase tracking-widest" :style="labelStyle">Others sharing rides</p>
          <div v-for="ride in rideShares" :key="ride.id" class="flex items-center gap-2.5 py-1.5 px-2 rounded-lg" style="background:#3b1f0d05;">
            <img :src="ride.dancerPhoto" :alt="ride.dancerName" class="w-8 h-8 rounded-full shrink-0">
            <div class="min-w-0 flex-1 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
              <span class="font-bold" style="color:#3b1f0d;">{{ ride.dancerName }}</span>
              <span class="ml-1">
                {{ ride.type === 'offering' ? 'from' : 'looking from' }} {{ ride.originCity }}<span v-if="ride.seatsAvailable"> · {{ ride.seatsAvailable }} seats</span>
              </span>
            </div>
            <span
              class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
              :style="ride.type === 'offering' ? { background: '#16a34a18', color: '#16a34a' } : { background: '#f59e0b18', color: '#f59e0b' }"
            >{{ ride.type === 'offering' ? 'Offering' : 'Looking' }}</span>
          </div>
        </div>
      </div>

      <!-- ROOMS -->
      <div v-if="sec.key === 'rooms' && expandedSections.has('rooms')" class="px-4 pb-4">
        <div v-if="!isSignedIn" class="rounded-xl border p-3 text-center" style="border-color:#3b1f0d15; background:#3b1f0d05;">
          <p class="text-sm mb-2" style="color:#5b3a1d; font-family: system-ui, sans-serif;">Sign in to find a roommate</p>
          <button
            type="button"
            class="px-4 py-2 rounded-full text-white text-xs font-bold uppercase tracking-wider"
            style="background:#16a34a; box-shadow: 0 3px 0 -1px #15803d;"
            @click="emit('sign-in')"
          >Sign in</button>
        </div>
        <div v-else class="rounded-xl border p-3 grid gap-2" style="border-color:#3b1f0d15; background:#3b1f0d05;">
          <button type="button" class="w-full flex items-center justify-between" @click="emit('toggle-roommate')">
            <span class="flex items-center gap-2 text-sm font-bold" style="color:#3b1f0d; font-family: system-ui, sans-serif;">
              <BedDouble class="w-4 h-4" :style="{ color: lookingForRoommate ? '#16a34a' : '#9a5614' }" />
              Looking for a roommate?
            </span>
            <span
              class="w-9 h-5 rounded-full transition-colors flex items-center px-0.5"
              :style="{ background: lookingForRoommate ? '#16a34a' : '#3b1f0d22' }"
            >
              <span
                class="w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
                :style="{ transform: lookingForRoommate ? 'translateX(14px)' : 'translateX(0)' }"
              />
            </span>
          </button>
          <p v-if="lookingForRoommate" class="text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            Other attendees looking for roommates will see you. Share your plan to connect.
          </p>
        </div>
      </div>

      <!-- DINNERS & ACTIVITIES -->
      <div v-if="sec.key === 'dinners' && expandedSections.has('dinners')" class="px-4 pb-4 grid gap-4">
        <div v-if="groupDinners.length" class="grid gap-2.5">
          <p class="text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            Join a group dinner with fellow dancers — meet new friends over a meal.
          </p>
          <div
            v-for="dinner in groupDinners"
            :key="dinner.id"
            class="rounded-xl border p-3 grid gap-1.5"
            style="border-color:#3b1f0d15;"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-bold" style="color:#3b1f0d;">{{ dinner.day }} dinner</span>
              <div class="flex items-center gap-1.5">
                <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style="background:#3b1f0d0a; color:#5b3a1d;">{{ dinner.joined }}/{{ dinner.maxSize }} joined</span>
                <span
                  v-if="dinner.joined < dinner.maxSize"
                  class="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  :style="dinner.maxSize - dinner.joined <= 3 ? { background: '#f59e0b18', color: '#f59e0b' } : { background: '#16a34a18', color: '#16a34a' }"
                >{{ dinner.maxSize - dinner.joined }} spots left</span>
                <span v-else class="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style="background:#3b1f0d0a; color:#9a5614;">Full</span>
              </div>
            </div>
            <p class="text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
              {{ dinner.timeSlot }}<span v-if="dinner.restaurant"> · {{ dinner.restaurant }}</span><span v-else-if="dinner.date" class="italic"> · Restaurant revealed on {{ dinner.day }}</span>
            </p>
            <div class="w-full rounded-full h-1.5" style="background:#3b1f0d12;">
              <div class="rounded-full h-1.5 transition-all" :style="{ width: `${(dinner.joined / dinner.maxSize) * 100}%`, background: '#f59e0b' }" />
            </div>
            <button
              v-if="!dinner.userJoined && dinner.joined < dinner.maxSize"
              type="button"
              class="w-full py-2 rounded-full text-xs font-bold uppercase tracking-wider"
              style="background:white; color:#f59e0b; border:1.5px solid #f59e0b55;"
              @click="emit('join-dinner', dinner.id)"
            >Join this dinner</button>
            <template v-else-if="dinner.userJoined">
              <p class="text-xs font-bold flex items-center gap-1" style="color:#16a34a; font-family: system-ui, sans-serif;">
                <Check class="w-3 h-3" style="stroke-width:2.5;" /> You're in!
              </p>
              <div v-if="dinner.groupChatLink" class="flex items-center gap-2 mt-0.5">
                <a :href="dinner.groupChatLink" target="_blank" class="text-xs font-bold hover:underline flex items-center gap-1" style="color:#0891b2; font-family: system-ui, sans-serif;">
                  <MessageCircle class="w-3 h-3" /> Open group chat
                </a>
                <div v-if="dinner.groupMembers?.length" class="flex -space-x-1">
                  <img v-for="m in dinner.groupMembers" :key="m.name" :src="m.photo" :alt="m.name" class="w-5 h-5 rounded-full border-2 border-white">
                </div>
              </div>
            </template>
          </div>
        </div>

        <div v-if="extraActivities.length" class="grid gap-2.5">
          <div class="flex items-center gap-1.5">
            <Compass class="w-4 h-4" style="color:#9a5614;" />
            <p class="text-sm font-bold" style="color:#3b1f0d; font-family: system-ui, sans-serif;">Extra activities</p>
          </div>
          <div
            v-for="activity in extraActivities"
            :key="activity.id"
            class="rounded-xl border p-3 grid gap-1.5"
            style="border-color:#3b1f0d15;"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-bold" style="color:#3b1f0d;">{{ activity.title }}</span>
              <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style="background:#3b1f0d0a; color:#5b3a1d;">
                {{ activity.participantCount }}<span v-if="activity.maxParticipants">/{{ activity.maxParticipants }}</span> joined
              </span>
            </div>
            <p class="text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">{{ activity.date }} · {{ activity.time }}</p>
            <p v-if="activity.description" class="text-xs" style="color:#9a5614; font-family: system-ui, sans-serif;">{{ activity.description }}</p>
            <button
              v-if="!activity.userJoined"
              type="button"
              class="w-full py-2 rounded-full text-xs font-bold uppercase tracking-wider"
              style="background:white; color:#a855f7; border:1.5px solid #a855f755;"
              @click="emit('join-activity', activity.id)"
            >Join</button>
            <p v-else class="text-xs font-bold flex items-center gap-1" style="color:#16a34a; font-family: system-ui, sans-serif;">
              <Check class="w-3 h-3" style="stroke-width:2.5;" /> You're in!
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
