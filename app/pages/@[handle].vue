<script setup lang="ts">
/**
 * /@<handle> — the unified profile route (v4-style). Resolves, in order:
 *   1. a professional profile (venue / artist / organizer) → rich layout here
 *   2. a dancer (by username) → redirect to the existing /u/<handle> page
 *   3. neither → a graceful "not on WeDance yet" stub (no 404)
 *
 * Venue layout adapts to the booking model:
 *   - 'free'  → a community commons (e.g. the Pinakothek open-air spot): a drawn
 *     map, community guidelines, an elected moderator, the scheduled events, and
 *     a FREE "book a slot" flow (accept the guidelines).
 *   - 'commercial' → a rentable venue: bookable spaces with a request flow.
 */
import { MapPin, Instagram, Youtube, Globe, Facebook, LayoutGrid, ArrowLeft, Check, Calendar, ScrollText, ShieldCheck, Trees } from 'lucide-vue-next'

definePageMeta({ layout: false })

const route = useRoute()
const { $trpc } = useNuxtApp()
const { dancerName } = useAuth()

const handle = computed(() => String(route.params.handle))

const pending = ref(true)
const data = ref<Awaited<ReturnType<typeof $trpc.entity.getByHandle.query>> | null>(null)
const schedule = ref<any[]>([])
const isStub = ref(false)

async function resolve() {
  pending.value = true
  isStub.value = false
  try {
    const pro = await $trpc.entity.getByHandle.query({ handle: handle.value })
    if (pro) {
      data.value = pro
      pending.value = false
      try { schedule.value = await $trpc.booking.scheduleForProfile.query({ profileId: pro.profile.id }) } catch { /* empty */ }
      return
    }
    try {
      await $trpc.profile.getByUsername.query({ username: handle.value })
      await navigateTo(`/u/${handle.value}`, { replace: true })
      return
    } catch { isStub.value = true }
  } catch { isStub.value = true }
  pending.value = false
}
onMounted(resolve)

const profile = computed(() => data.value?.profile ?? null)
const spaces = computed(() => data.value?.spaces ?? [])
const isFree = computed(() => profile.value?.bookingModel === 'free')
const spaceName = (id: string) => spaces.value.find((s: any) => s.id === id)?.name ?? 'Area'

const typeLabel: Record<string, string> = { venue: 'Venue', artist: 'Artist', organizer: 'Organizer' }
const socialIcon: Record<string, any> = { instagram: Instagram, youtube: Youtube, facebook: Facebook, website: Globe }
const initials = computed(() => {
  const n = (profile.value?.name || '').trim()
  return n ? n.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') : '?'
})
function fmtDate(d: any) { if (!d) return 'Date TBD'; try { return new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) } catch { return String(d) } }

// --- Booking modal (a booking IS a scheduled event — collect enough info) ---
const EVENT_TYPES = ['Social', 'Party', 'Workshop', 'Class', 'Practica']
const DANCE_STYLES = ['Salsa', 'Bachata', 'Kizomba', 'Zouk', 'Timba', 'Casino', 'Rueda', 'Afro']
const booking = reactive({
  open: false, spaceId: '', spaceName: '',
  title: '', eventType: 'Social', styles: [] as string[], artists: '',
  email: '', name: '', eventDate: '', startTime: '', endTime: '',
  headcount: '' as string | number, message: '', terms: false, busy: false, err: '', done: false,
})
function openBooking(space: any) {
  Object.assign(booking, {
    open: true, spaceId: space.id, spaceName: space.name,
    title: '', eventType: 'Social', styles: [], artists: '',
    email: '', name: (dancerName.value as string) || '', eventDate: '', startTime: '', endTime: '',
    headcount: '', message: '', terms: false, err: '', done: false,
  })
}
function toggleBookingStyle(s: string) {
  const i = booking.styles.indexOf(s)
  if (i >= 0) booking.styles.splice(i, 1); else booking.styles.push(s)
}
// From the availability calendar: open the form pre-filled with the picked slot.
function onCalendarBook(slot: { spaceId: string; spaceName: string; date: string }) {
  openBooking({ id: slot.spaceId, name: slot.spaceName })
  booking.eventDate = slot.date
}
async function submitBooking() {
  booking.err = ''
  if (!booking.title.trim()) { booking.err = 'Give your event a name.'; return }
  if (!booking.email.trim()) { booking.err = 'Add an email so the moderator can reply.'; return }
  if (!booking.terms) { booking.err = isFree.value ? 'Please agree to the community guidelines.' : 'Please accept the booking terms.'; return }
  booking.busy = true
  try {
    await $trpc.booking.request.mutate({
      spaceId: booking.spaceId, email: booking.email.trim(), name: booking.name.trim() || undefined,
      title: booking.title.trim(), eventType: booking.eventType, styles: booking.styles,
      artists: booking.artists.split(',').map(a => a.trim()).filter(Boolean),
      eventDate: booking.eventDate || undefined, startTime: booking.startTime || undefined, endTime: booking.endTime || undefined,
      headcount: booking.headcount ? Number(booking.headcount) : undefined,
      message: booking.message.trim() || undefined, termsAccepted: booking.terms,
    })
    booking.done = true
    if (profile.value) { try { schedule.value = await $trpc.booking.scheduleForProfile.query({ profileId: profile.value.id }) } catch {} }
  } catch (e: any) { booking.err = e?.message || 'Could not send your request.' } finally { booking.busy = false }
}

useHead(() => ({
  title: profile.value ? `${profile.value.name} — WeDance` : 'WeDance',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
}))
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />

    <section v-if="pending" class="max-w-2xl mx-auto px-4 py-24 text-center">
      <div class="inline-block w-8 h-8 rounded-full border-2 animate-spin" style="border-color:#dc262633; border-top-color:#dc2626;" />
    </section>

    <section v-else-if="isStub" class="max-w-xl mx-auto px-4 py-20 text-center">
      <h1 class="text-4xl" style="color:#3b1f0d;">Not on WeDance yet</h1>
      <p class="mt-4 text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
        <span class="font-bold">@{{ handle }}</span> doesn't have a page here yet. Run this venue or organise here? Claim it.
      </p>
      <NuxtLink to="/for-events" class="inline-flex items-center gap-2 mt-6 rounded-full px-5 py-2.5 text-white text-sm font-bold uppercase tracking-wider" style="background:linear-gradient(135deg,#dc2626,#f97316);">Claim / list a space</NuxtLink>
      <div class="mt-4"><NuxtLink to="/cities" class="inline-flex items-center gap-1 text-xs font-bold" style="color:#dc2626; font-family: system-ui, sans-serif;"><ArrowLeft class="w-3 h-3" /> Browse cities</NuxtLink></div>
    </section>

    <template v-else-if="profile">
      <!-- Header -->
      <section class="max-w-2xl mx-auto px-4 pt-12 pb-6">
        <div class="rounded-2xl overflow-hidden bg-white border" style="border-color:#dc262633; box-shadow: 0 1px 0 #dc262622, 0 10px 28px rgba(59,31,18,0.06);">
          <div class="h-2" style="background:linear-gradient(135deg, #dc2626, #f97316);" />
          <div class="p-6 sm:p-8">
            <div class="flex items-start gap-5">
              <div class="shrink-0">
                <img v-if="profile.photo" :src="profile.photo" :alt="profile.name" class="w-20 h-20 rounded-full object-cover" style="border:2px solid #dc262633;">
                <div v-else class="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white" style="background:linear-gradient(135deg,#dc2626,#f97316);">{{ initials }}</div>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-[10px] uppercase tracking-[0.3em] font-bold" style="color:#9a5614; font-family: system-ui, sans-serif;">{{ typeLabel[profile.type] || 'Profile' }}</span>
                  <span v-if="profile.venueType === 'OpenAir'" class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5" style="background:#16a34a18; color:#16a34a; font-family: system-ui, sans-serif;"><Trees class="w-3 h-3" /> Open air</span>
                  <span v-if="isFree" class="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5" style="background:#dc262614; color:#dc2626; font-family: system-ui, sans-serif;">Free · community-run</span>
                </div>
                <h1 class="text-3xl leading-tight mt-0.5" style="color:#3b1f0d;">{{ profile.name }}</h1>
                <div class="text-sm mt-0.5" style="color:#9a5614; font-family:'Caveat', cursive; font-size:18px;">@{{ profile.username }}</div>
                <div v-if="profile.address" class="flex items-start gap-1 mt-2 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;"><MapPin class="w-3 h-3 mt-0.5 shrink-0" style="color:#9a5614;" /> {{ profile.address }}</div>
              </div>
            </div>
            <p v-if="profile.bio" class="mt-5 text-sm leading-relaxed" style="color:#5b3a1d; font-family: system-ui, sans-serif;">{{ profile.bio }}</p>
            <div v-if="profile.socials?.length" class="mt-4 flex items-center gap-2">
              <a v-for="s in profile.socials" :key="s.platform" :href="s.url" target="_blank" rel="noopener" class="inline-flex items-center justify-center w-9 h-9 rounded-full" style="background:#dc262614; color:#dc2626;" :aria-label="s.platform"><component :is="socialIcon[s.platform] || Globe" class="w-4 h-4" /></a>
            </div>
            <div v-if="profile.moderatorName" class="mt-4 flex items-center gap-1.5 text-xs" style="color:#9a5614; font-family: system-ui, sans-serif;">
              <ShieldCheck class="w-3.5 h-3.5" /> Moderated by the {{ profile.moderatorName }}<span v-if="profile.moderatorSince"> · since {{ profile.moderatorSince }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Map -->
      <section v-if="profile.mapUrl" class="max-w-2xl mx-auto px-4 pb-6" style="font-family: system-ui, sans-serif;">
        <div class="flex items-center gap-2 mb-2"><LayoutGrid class="w-5 h-5" style="color:#dc2626;" /><h2 class="text-2xl" style="font-family:'Playfair Display', serif; color:#3b1f0d;">The map</h2></div>
        <img :src="profile.mapUrl" alt="Map of the dance areas" class="w-full rounded-2xl border" style="border-color:#3b1f0d1a;">
      </section>

      <!-- Scheduled events (first) -->
      <section class="max-w-2xl mx-auto px-4 pb-6" style="font-family: system-ui, sans-serif;">
        <div class="flex items-center gap-2"><Calendar class="w-5 h-5" style="color:#dc2626;" /><h2 class="text-2xl" style="font-family:'Playfair Display', serif; color:#3b1f0d;">Scheduled</h2></div>
        <ul v-if="schedule.length" class="mt-3 space-y-2">
          <li v-for="ev in schedule" :key="ev.id" class="flex items-start gap-3 rounded-xl border p-3 bg-white" style="border-color:#3b1f0d1a;">
            <div class="text-center shrink-0 w-16">
              <div class="text-[10px] uppercase font-bold leading-tight" style="color:#dc2626;">{{ fmtDate(ev.eventDate) }}</div>
              <div v-if="ev.startTime" class="text-[10px] mt-0.5" style="color:#9a5614;">{{ ev.startTime }}<span v-if="ev.endTime">–{{ ev.endTime }}</span></div>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-sm font-bold" style="color:#3b1f0d;">{{ ev.title || ev.message || 'Social' }}</span>
                <span v-if="ev.eventType" class="text-[9px] uppercase tracking-wider font-bold rounded-full px-1.5 py-0.5" style="background:#3b1f0d0f; color:#5b3a1d;">{{ ev.eventType }}</span>
              </div>
              <div class="text-[11px] mt-0.5" style="color:#9a5614;">
                {{ spaceName(ev.spaceId) }}<span v-if="ev.styles?.length"> · {{ ev.styles.join(', ') }}</span><span v-if="ev.requesterName"> · {{ ev.requesterName }}</span>
              </div>
              <div v-if="ev.artists?.length" class="text-[11px] mt-0.5" style="color:#5b3a1d;">
                with
                <template v-for="(a, i) in ev.artists" :key="i"><NuxtLink v-if="String(a).startsWith('@')" :to="`/${a}`" class="font-bold hover:underline" style="color:#dc2626;">{{ a }}</NuxtLink><span v-else class="font-bold">{{ a }}</span>{{ i < ev.artists.length - 1 ? ', ' : '' }}</template>
              </div>
            </div>
            <span class="text-[9px] uppercase tracking-wider font-bold rounded-full px-1.5 py-0.5 shrink-0" :style="ev.status === 'accepted' ? 'background:#16a34a18; color:#16a34a;' : 'background:#f59e0b18; color:#b45309;'">{{ ev.status === 'accepted' ? 'Confirmed' : 'Proposed' }}</span>
          </li>
        </ul>
        <p v-else class="mt-3 text-sm italic" style="color:#9a5614;">Nothing scheduled yet — book the first slot.</p>
      </section>

      <!-- Book a (free) slot -->
      <section v-if="spaces.length" class="max-w-2xl mx-auto px-4 pb-4" style="font-family: system-ui, sans-serif;">
        <div class="flex items-center gap-2"><LayoutGrid class="w-5 h-5" style="color:#dc2626;" /><h2 class="text-2xl" style="font-family:'Playfair Display', serif; color:#3b1f0d;">{{ isFree ? 'Book a free slot' : 'Book a space' }}</h2></div>
        <p class="mt-1 text-sm" style="color:#5b3a1d;">{{ isFree ? `Pick a free slot in any of the ${spaces.length} areas — it's free. A community moderator confirms it against the guidelines.` : `Pick an available slot in one of ${spaces.length} areas.` }}</p>
        <AvailabilityCalendar :spaces="spaces" :bookings="schedule" class="mt-4" @book="onCalendarBook" />
      </section>

      <!-- Guidelines -->
      <section v-if="profile.guidelines" class="max-w-2xl mx-auto px-4 pb-6" style="font-family: system-ui, sans-serif;">
        <div class="flex items-center gap-2"><ScrollText class="w-5 h-5" style="color:#dc2626;" /><h2 class="text-2xl" style="font-family:'Playfair Display', serif; color:#3b1f0d;">Guidelines</h2></div>
        <p class="mt-1 text-xs" style="color:#9a5614;">Proposed by the elected moderator — keep to them and the spot stays ours.</p>
        <div class="mt-3 rounded-2xl border p-4 whitespace-pre-line text-sm leading-relaxed" style="border-color:#dc262633; background:white; color:#5b3a1d;">{{ profile.guidelines }}</div>
      </section>

      <!-- Reviews -->
      <section class="max-w-2xl mx-auto px-4 pb-16">
        <ReviewsSection :target-type="profile.type" :target-slug="profile.username" :target-name="profile.name" :city-slug="profile.citySlug || undefined" />
      </section>
    </template>

    <SiteFooter />

    <!-- Booking modal -->
    <div v-if="booking.open" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style="background:rgba(59,31,18,0.4);" @click.self="booking.open = false">
      <div class="w-full max-w-md rounded-2xl bg-white p-6" style="font-family: system-ui, sans-serif; box-shadow: 0 20px 50px rgba(0,0,0,0.25);">
        <template v-if="!booking.done">
          <h3 class="text-xl font-bold" style="font-family:'Playfair Display', serif; color:#3b1f0d;">{{ isFree ? 'Book' : 'Request' }} “{{ booking.spaceName }}”</h3>
          <p class="text-xs mt-1" style="color:#9a5614;">{{ isFree ? 'Free — a community moderator confirms it against the guidelines.' : 'WeDance connects you with the venue — no payment here.' }}</p>
          <div class="mt-4 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <input v-model="booking.title" type="text" maxlength="120" placeholder="Event name — e.g. Sunday Salsa Social" class="w-full h-10 rounded-xl px-3 text-sm outline-none" style="background:#fbf5ea; border:1px solid #3b1f0d33;">
            <select v-model="booking.eventType" class="w-full h-10 rounded-xl px-3 text-sm outline-none" style="background:#fbf5ea; border:1px solid #3b1f0d33;">
              <option v-for="t in EVENT_TYPES" :key="t" :value="t">{{ t }}</option>
            </select>
            <div>
              <div class="text-[10px] uppercase tracking-wider font-bold mb-1.5" style="color:#9a5614;">Styles</div>
              <div class="flex flex-wrap gap-1.5">
                <button v-for="s in DANCE_STYLES" :key="s" type="button" class="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider" :style="booking.styles.includes(s) ? 'background:#dc2626; color:white;' : 'background:#dc262614; color:#dc2626;'" @click="toggleBookingStyle(s)">{{ s }}</button>
              </div>
            </div>
            <div class="flex gap-2">
              <input v-model="booking.eventDate" type="date" class="flex-1 h-10 rounded-xl px-3 text-sm outline-none" style="background:#fbf5ea; border:1px solid #3b1f0d33;" aria-label="Date">
              <input v-model="booking.startTime" type="time" class="w-28 h-10 rounded-xl px-2 text-sm outline-none" style="background:#fbf5ea; border:1px solid #3b1f0d33;" aria-label="Start">
              <input v-model="booking.endTime" type="time" class="w-28 h-10 rounded-xl px-2 text-sm outline-none" style="background:#fbf5ea; border:1px solid #3b1f0d33;" aria-label="End">
            </div>
            <input v-model="booking.artists" type="text" placeholder="Artists / DJs / teachers (comma-separated · @handle or name)" class="w-full h-10 rounded-xl px-3 text-sm outline-none" style="background:#fbf5ea; border:1px solid #3b1f0d33;">
            <textarea v-model="booking.message" rows="2" maxlength="2000" placeholder="Anything the community should know (level, entry…)" class="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none" style="background:#fbf5ea; border:1px solid #3b1f0d33;" />
            <div class="flex gap-2">
              <input v-model="booking.name" type="text" placeholder="Your name" class="flex-1 h-10 rounded-xl px-3 text-sm outline-none" style="background:#fbf5ea; border:1px solid #3b1f0d33;">
              <input v-model="booking.headcount" type="number" min="1" placeholder="Guests" class="w-24 h-10 rounded-xl px-3 text-sm outline-none" style="background:#fbf5ea; border:1px solid #3b1f0d33;">
            </div>
            <input v-model="booking.email" type="email" placeholder="Email (so the moderator can reply)" class="w-full h-10 rounded-xl px-3 text-sm outline-none" style="background:#fbf5ea; border:1px solid #3b1f0d33;">
            <label class="flex items-start gap-2 text-xs cursor-pointer" style="color:#5b3a1d;">
              <input v-model="booking.terms" type="checkbox" class="mt-0.5 w-4 h-4 accent-[#dc2626]">
              <span v-if="isFree">I've read and will follow the <a href="#" class="underline font-bold" style="color:#dc2626;" @click.prevent="booking.open && (document.querySelector('.whitespace-pre-line')?.scrollIntoView({behavior:'smooth'}))">community guidelines</a>.</span>
              <span v-else>I accept the <NuxtLink to="/booking-terms" target="_blank" class="underline font-bold" style="color:#dc2626;">booking terms</NuxtLink>.</span>
            </label>
            <p v-if="booking.err" class="text-sm font-bold" style="color:#dc2626;">{{ booking.err }}</p>
          </div>
          <div class="mt-4 flex gap-2">
            <button type="button" :disabled="booking.busy" class="flex-1 h-11 rounded-full text-white text-sm font-bold uppercase tracking-wider disabled:opacity-60" style="background:linear-gradient(135deg,#dc2626,#f97316);" @click="submitBooking">{{ booking.busy ? 'Sending…' : (isFree ? 'Book it' : 'Send request') }}</button>
            <button type="button" class="h-11 px-4 rounded-full text-sm font-bold" style="color:#9a5614;" @click="booking.open = false">Cancel</button>
          </div>
        </template>
        <template v-else>
          <div class="text-center py-4">
            <div class="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-white" style="background:#16a34a;"><Check class="w-6 h-6" /></div>
            <h3 class="text-xl font-bold mt-3" style="font-family:'Playfair Display', serif; color:#3b1f0d;">{{ isFree ? 'Slot proposed' : 'Request sent' }}</h3>
            <p class="text-sm mt-1" style="color:#5b3a1d;">{{ isFree ? 'The moderator will confirm against the guidelines. See you on the floor!' : 'The venue will reply to your email.' }}</p>
            <button type="button" class="mt-4 rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white" style="background:#dc2626;" @click="booking.open = false">Done</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
