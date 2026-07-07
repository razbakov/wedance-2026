<script setup lang="ts">
/**
 * /@<handle> — the unified profile route (v4-style). Resolves, in order:
 *   1. a professional profile (venue / artist / organizer) → rich layout here
 *   2. a dancer (by username) → redirect to the existing /u/<handle> page
 *   3. neither → a graceful "not on WeDance yet" stub (no 404)
 * Client-side fetch (the tRPC client is client-only). Venue layout shows the
 * profile, its reviews, and bookable spaces with a connector-model booking flow.
 */
import { MapPin, Instagram, Youtube, Globe, Facebook, Users, LayoutGrid, ArrowLeft, Check } from 'lucide-vue-next'

definePageMeta({ layout: false })

const route = useRoute()
const { $trpc } = useNuxtApp()
const { isSignedIn, dancerName } = useAuth()

const handle = computed(() => String(route.params.handle))

const pending = ref(true)
const data = ref<Awaited<ReturnType<typeof $trpc.entity.getByHandle.query>> | null>(null)
const isStub = ref(false)

async function resolve() {
  pending.value = true
  isStub.value = false
  try {
    const pro = await $trpc.entity.getByHandle.query({ handle: handle.value })
    if (pro) { data.value = pro; pending.value = false; return }
    // Not a pro profile — is it a dancer?
    try {
      await $trpc.profile.getByUsername.query({ username: handle.value })
      await navigateTo(`/u/${handle.value}`, { replace: true })
      return
    } catch {
      isStub.value = true
    }
  } catch {
    isStub.value = true
  }
  pending.value = false
}
onMounted(resolve)

const profile = computed(() => data.value?.profile ?? null)
const spaces = computed(() => data.value?.spaces ?? [])

const typeLabel: Record<string, string> = { venue: 'Venue', artist: 'Artist', organizer: 'Organizer' }
const socialIcon: Record<string, any> = { instagram: Instagram, youtube: Youtube, facebook: Facebook, website: Globe }

const initials = computed(() => {
  const n = (profile.value?.name || '').trim()
  return n ? n.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') : '?'
})

// --- Booking modal ---
const booking = reactive({
  open: false,
  spaceId: '' as string,
  spaceName: '' as string,
  email: '',
  name: '',
  eventDate: '',
  headcount: '' as string | number,
  message: '',
  terms: false,
  busy: false,
  err: '',
  done: false,
})

function openBooking(space: any) {
  booking.open = true
  booking.spaceId = space.id
  booking.spaceName = space.name
  booking.email = ''
  booking.name = (dancerName.value as string) || ''
  booking.eventDate = ''
  booking.headcount = ''
  booking.message = ''
  booking.terms = false
  booking.err = ''
  booking.done = false
}

async function submitBooking() {
  booking.err = ''
  if (!booking.email.trim()) { booking.err = 'Add an email so the venue can reply.'; return }
  if (!booking.terms) { booking.err = 'Please accept the booking terms.'; return }
  booking.busy = true
  try {
    await $trpc.booking.request.mutate({
      spaceId: booking.spaceId,
      email: booking.email.trim(),
      name: booking.name.trim() || undefined,
      eventDate: booking.eventDate || undefined,
      headcount: booking.headcount ? Number(booking.headcount) : undefined,
      message: booking.message.trim() || undefined,
      termsAccepted: booking.terms,
    })
    booking.done = true
  } catch (e: any) {
    booking.err = e?.message || 'Could not send your request.'
  } finally {
    booking.busy = false
  }
}

useHead(() => ({
  title: profile.value ? `${profile.value.name} — WeDance` : 'WeDance',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
}))
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />

    <!-- Loading -->
    <section v-if="pending" class="max-w-2xl mx-auto px-4 py-24 text-center">
      <div class="inline-block w-8 h-8 rounded-full border-2 animate-spin" style="border-color:#dc262633; border-top-color:#dc2626;" />
    </section>

    <!-- Stub: handle not on WeDance yet -->
    <section v-else-if="isStub" class="max-w-xl mx-auto px-4 py-20 text-center">
      <h1 class="text-4xl" style="color:#3b1f0d;">Not on WeDance yet</h1>
      <p class="mt-4 text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
        <span class="font-bold">@{{ handle }}</span> doesn't have a page here yet.
        Run this venue or organize here? Claim it and let dancers find &amp; book you.
      </p>
      <NuxtLink to="/for-events" class="inline-flex items-center gap-2 mt-6 rounded-full px-5 py-2.5 text-white text-sm font-bold uppercase tracking-wider" style="background:linear-gradient(135deg,#dc2626,#f97316);">
        Claim / list a space
      </NuxtLink>
      <div class="mt-4">
        <NuxtLink to="/cities" class="inline-flex items-center gap-1 text-xs font-bold" style="color:#dc2626; font-family: system-ui, sans-serif;"><ArrowLeft class="w-3 h-3" /> Browse cities</NuxtLink>
      </div>
    </section>

    <!-- Professional profile (venue/artist/organizer) -->
    <template v-else-if="profile">
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
                <div class="text-[10px] uppercase tracking-[0.3em] font-bold" style="color:#9a5614; font-family: system-ui, sans-serif;">{{ typeLabel[profile.type] || 'Profile' }}</div>
                <h1 class="text-3xl leading-tight" style="color:#3b1f0d;">{{ profile.name }}</h1>
                <div class="text-sm mt-0.5" style="color:#9a5614; font-family:'Caveat', cursive; font-size:18px;">@{{ profile.username }}</div>
                <div v-if="profile.city" class="flex items-center gap-1 mt-2 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                  <MapPin class="w-3 h-3" style="color:#9a5614;" /> {{ profile.city }}<span v-if="profile.floorType"> · {{ profile.floorType }} floor</span>
                </div>
              </div>
            </div>
            <p v-if="profile.bio" class="mt-5 text-sm leading-relaxed" style="color:#5b3a1d; font-family: system-ui, sans-serif;">{{ profile.bio }}</p>
            <div v-if="profile.socials?.length" class="mt-4 flex items-center gap-2">
              <a v-for="s in profile.socials" :key="s.platform" :href="s.url" target="_blank" rel="noopener" class="inline-flex items-center justify-center w-9 h-9 rounded-full" style="background:#dc262614; color:#dc2626;" :aria-label="s.platform">
                <component :is="socialIcon[s.platform] || Globe" class="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- Bookable spaces (venues) -->
      <section v-if="spaces.length" class="max-w-2xl mx-auto px-4 pb-4" style="font-family: system-ui, sans-serif;">
        <div class="flex items-center gap-2">
          <LayoutGrid class="w-5 h-5" style="color:#dc2626;" />
          <h2 class="text-2xl" style="font-family:'Playfair Display', serif; color:#3b1f0d;">Book a space</h2>
        </div>
        <p class="mt-1 text-sm" style="color:#5b3a1d;">Running a social or class? Request one of {{ spaces.length }} areas.</p>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <div v-for="sp in spaces" :key="sp.id" class="rounded-2xl overflow-hidden bg-white border flex flex-col" style="border-color:#3b1f0d1a;">
            <div v-if="sp.imageUrl" class="aspect-video bg-black/5"><img :src="sp.imageUrl" :alt="sp.name" class="w-full h-full object-cover"></div>
            <div class="p-4 flex-1 flex flex-col">
              <h3 class="font-bold" style="color:#3b1f0d;">{{ sp.name }}</h3>
              <div class="text-[11px] mt-0.5" style="color:#9a5614;">
                <span v-if="sp.capacity">up to {{ sp.capacity }}</span><span v-if="sp.floorType"> · {{ sp.floorType }}</span>
              </div>
              <p v-if="sp.description" class="text-xs mt-2 leading-relaxed" style="color:#5b3a1d;">{{ sp.description }}</p>
              <div class="mt-3 flex items-center justify-between gap-2">
                <span class="text-xs font-bold" style="color:#3b1f0d;">{{ sp.priceInfo || 'On request' }}</span>
                <button type="button" class="rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white" style="background:#dc2626;" @click="openBooking(sp)">Request</button>
              </div>
            </div>
          </div>
        </div>
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
          <h3 class="text-xl font-bold" style="font-family:'Playfair Display', serif; color:#3b1f0d;">Request “{{ booking.spaceName }}”</h3>
          <p class="text-xs mt-1" style="color:#9a5614;">WeDance connects you with the venue — no payment here.</p>
          <div class="mt-4 space-y-3">
            <input v-model="booking.name" type="text" placeholder="Your name" class="w-full h-10 rounded-xl px-3 text-sm outline-none" style="background:#fbf5ea; border:1px solid #3b1f0d33;">
            <input v-model="booking.email" type="email" placeholder="Email (so the venue can reply)" class="w-full h-10 rounded-xl px-3 text-sm outline-none" style="background:#fbf5ea; border:1px solid #3b1f0d33;">
            <div class="flex gap-2">
              <input v-model="booking.eventDate" type="date" class="flex-1 h-10 rounded-xl px-3 text-sm outline-none" style="background:#fbf5ea; border:1px solid #3b1f0d33;">
              <input v-model="booking.headcount" type="number" min="1" placeholder="Guests" class="w-24 h-10 rounded-xl px-3 text-sm outline-none" style="background:#fbf5ea; border:1px solid #3b1f0d33;">
            </div>
            <textarea v-model="booking.message" rows="2" placeholder="What are you planning?" class="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none" style="background:#fbf5ea; border:1px solid #3b1f0d33;" />
            <label class="flex items-start gap-2 text-xs cursor-pointer" style="color:#5b3a1d;">
              <input v-model="booking.terms" type="checkbox" class="mt-0.5 w-4 h-4 accent-[#dc2626]">
              <span>I accept the <NuxtLink to="/booking-terms" target="_blank" class="underline font-bold" style="color:#dc2626;">booking terms</NuxtLink>.</span>
            </label>
            <p v-if="booking.err" class="text-sm font-bold" style="color:#dc2626;">{{ booking.err }}</p>
          </div>
          <div class="mt-4 flex gap-2">
            <button type="button" :disabled="booking.busy" class="flex-1 h-11 rounded-full text-white text-sm font-bold uppercase tracking-wider disabled:opacity-60" style="background:linear-gradient(135deg,#dc2626,#f97316);" @click="submitBooking">{{ booking.busy ? 'Sending…' : 'Send request' }}</button>
            <button type="button" class="h-11 px-4 rounded-full text-sm font-bold" style="color:#9a5614;" @click="booking.open = false">Cancel</button>
          </div>
        </template>
        <template v-else>
          <div class="text-center py-4">
            <div class="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-white" style="background:#16a34a;"><Check class="w-6 h-6" /></div>
            <h3 class="text-xl font-bold mt-3" style="font-family:'Playfair Display', serif; color:#3b1f0d;">Request sent</h3>
            <p class="text-sm mt-1" style="color:#5b3a1d;">The venue will reply to your email. Good luck with the event!</p>
            <button type="button" class="mt-4 rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white" style="background:#dc2626;" @click="booking.open = false">Done</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
