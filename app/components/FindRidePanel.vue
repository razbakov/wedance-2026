<script setup lang="ts">
/**
 * FindRidePanel — inline ride-share listing + offer form for a festival.
 * Shown inside the my-plan expanded card when the user clicks "Find a ride".
 * Loads ride-shares from the backend, displays them (driver, city, date),
 * falls back to a flight-search link when none exist, and lets the user
 * offer their own ride.
 */
import { Car, Plane, ExternalLink } from 'lucide-vue-next'
import { RidePostSchema } from '#shared/validation'

const props = defineProps<{
  festivalSlug: string
  festivalLocation: string
  festivalStartDate: string
  accentColor: string
  isSignedIn: boolean
}>()

const emit = defineEmits<{
  'sign-in': []
}>()

const { rideShares, loadRideShares, postRide, deleteRide } = useRideShares(props.festivalSlug)

const loading = ref(true)
onMounted(async () => {
  await loadRideShares()
  loading.value = false
})

// Ride form state
const rideMode = ref<'offering' | 'looking' | null>(null)
const rideOriginCity = ref('')
const rideDate = ref('')
const rideSeats = ref(2)
const rideForm = reactive(useFormValidation(RidePostSchema, () => ({
  type: rideMode.value ?? 'offering',
  originCity: rideOriginCity.value,
  date: rideDate.value,
  seats: rideMode.value === 'offering' ? rideSeats.value : undefined,
})))
watch(rideMode, () => rideForm.reset())

const submitting = ref(false)
async function submitRide() {
  if (!rideMode.value) return
  const result = rideForm.validate()
  if (!result.success) return
  submitting.value = true
  try {
    await postRide(result.data)
    rideOriginCity.value = ''
    rideDate.value = ''
    rideSeats.value = 2
    rideMode.value = null
  } finally {
    submitting.value = false
  }
}

async function onDeleteRide() {
  try {
    await deleteRide()
  } catch { /* composable handles rollback */ }
}

const flightsHref = computed(() =>
  `https://www.google.com/travel/flights?q=flights%20to%20${encodeURIComponent(props.festivalLocation)}%20${props.festivalStartDate}`,
)

const fieldClass = 'mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none transition-all'
const fieldStyle = 'background:white; border-color:#3b1f0d33; color:#3b1f0d; font-family: system-ui, sans-serif;'
const labelStyle = 'color:#9a5614; font-family: system-ui, sans-serif;'

const hasOwnRide = computed(() => rideShares.value.some(r => r.isOwn))
const othersRides = computed(() => rideShares.value.filter(r => !r.isOwn))
</script>

<template>
  <div class="rounded-xl border overflow-hidden" style="border-color:#0891b255; background:white;">
    <!-- Header -->
    <div class="flex items-center gap-2 px-3 py-2.5" style="background:#0891b20a;">
      <Car class="w-4 h-4 shrink-0" style="color:#0891b2; stroke-width:1.75;" />
      <span class="text-sm font-bold" style="color:#3b1f0d; font-family:'Playfair Display', serif;">
        Find a ride
      </span>
      <span v-if="rideShares.length && !loading" class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ml-auto" style="background:#0891b218; color:#0891b2;">
        {{ rideShares.length }} sharing
      </span>
    </div>

    <div class="px-3 pb-3 grid gap-2.5">
      <!-- Loading -->
      <p v-if="loading" class="text-xs py-2" style="color:#9a5614; font-family: system-ui, sans-serif;">
        Loading rides...
      </p>

      <template v-else>
        <!-- Ride-share list -->
        <div v-if="rideShares.length" class="grid gap-1.5">
          <div
            v-for="ride in rideShares"
            :key="ride.id"
            class="flex items-center gap-2.5 py-2 px-2.5 rounded-lg"
            style="background:#3b1f0d05;"
          >
            <img
              v-if="ride.dancerPhoto"
              :src="ride.dancerPhoto"
              :alt="ride.dancerName"
              class="w-7 h-7 rounded-full shrink-0 object-cover"
            >
            <span v-else class="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold" style="background:#0891b218; color:#0891b2;">
              {{ ride.dancerName.charAt(0) }}
            </span>
            <div class="min-w-0 flex-1 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
              <span class="font-bold" style="color:#3b1f0d;">{{ ride.dancerName }}</span>
              <span class="ml-1">
                {{ ride.type === 'offering' ? 'from' : 'looking from' }} {{ ride.originCity }}
              </span>
              <span v-if="ride.date" class="ml-1">&middot; {{ ride.date }}</span>
              <span v-if="ride.seatsAvailable" class="ml-1">&middot; {{ ride.seatsAvailable }} seats</span>
            </div>
            <span
              class="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
              :style="ride.type === 'offering' ? { background: '#16a34a18', color: '#16a34a' } : { background: '#f59e0b18', color: '#f59e0b' }"
            >{{ ride.type === 'offering' ? 'Offering' : 'Looking' }}</span>
            <button
              v-if="ride.isOwn"
              type="button"
              class="text-[10px] font-bold italic hover:underline shrink-0"
              style="color:#dc2626;"
              @click="onDeleteRide"
            >Remove</button>
          </div>
        </div>

        <!-- No rides — flights fallback -->
        <div v-if="!rideShares.length" class="rounded-lg px-3 py-3 text-center" style="background:#3b1f0d05;">
          <p class="text-xs mb-2" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            No ride-shares yet. Be the first to offer one, or search flights.
          </p>
          <a
            :href="flightsHref"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-xs font-bold hover:underline"
            style="color:#0891b2; font-family: system-ui, sans-serif;"
          >
            <Plane class="w-3.5 h-3.5" /> Search flights <ExternalLink class="w-2.5 h-2.5" />
          </a>
        </div>

        <!-- Has rides but also show flights link -->
        <div v-if="othersRides.length" class="flex items-center justify-end">
          <a
            :href="flightsHref"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-[10px] italic hover:underline"
            style="color:#9a5614; font-family:'Playfair Display', serif;"
          >
            or flights <ExternalLink class="w-2.5 h-2.5" />
          </a>
        </div>

        <!-- Offer form (signed in) -->
        <div v-if="isSignedIn && !hasOwnRide" class="rounded-xl border p-3 grid gap-2" style="border-color:#3b1f0d15; background:#3b1f0d05;">
          <p class="text-[10px] font-bold uppercase tracking-widest" :style="labelStyle">Offer or find a ride</p>
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
              <input v-model="rideOriginCity" type="text" placeholder="e.g. Munich" :class="fieldClass" :style="fieldStyle" v-bind="rideForm.fieldAttrs('originCity', 'plan-ride-origin-error')">
              <FieldError id="plan-ride-origin-error" :message="rideForm.errors.originCity" />
            </div>
            <div>
              <label class="text-[10px] font-bold uppercase tracking-widest" :style="labelStyle">{{ rideMode === 'offering' ? 'Departure date' : 'Preferred date' }}</label>
              <input v-model="rideDate" type="date" :class="fieldClass" :style="fieldStyle" v-bind="rideForm.fieldAttrs('date', 'plan-ride-date-error')">
              <FieldError id="plan-ride-date-error" :message="rideForm.errors.date" />
            </div>
            <div v-if="rideMode === 'offering'">
              <label class="text-[10px] font-bold uppercase tracking-widest" :style="labelStyle">Seats available</label>
              <input v-model.number="rideSeats" type="number" min="1" max="6" :class="fieldClass" :style="fieldStyle" v-bind="rideForm.fieldAttrs('seats', 'plan-ride-seats-error')">
              <FieldError id="plan-ride-seats-error" :message="rideForm.errors.seats" />
            </div>
            <button
              type="button"
              class="w-full py-2.5 rounded-full text-white text-xs font-bold uppercase tracking-wider"
              :disabled="submitting"
              style="background:#0891b2; box-shadow: 0 3px 0 -1px #0e7490;"
              @click="submitRide"
            >{{ submitting ? 'Posting...' : 'Post my ride' }}</button>
          </div>
        </div>

        <!-- Not signed in -->
        <div v-if="!isSignedIn" class="rounded-xl border p-3 text-center" style="border-color:#3b1f0d15; background:#3b1f0d05;">
          <p class="text-xs mb-2" style="color:#5b3a1d; font-family: system-ui, sans-serif;">Sign in to share or find a ride</p>
          <button
            type="button"
            class="px-4 py-2 rounded-full text-white text-xs font-bold uppercase tracking-wider"
            style="background:#0891b2; box-shadow: 0 3px 0 -1px #0e7490;"
            @click="emit('sign-in')"
          >Sign in</button>
        </div>
      </template>
    </div>
  </div>
</template>
