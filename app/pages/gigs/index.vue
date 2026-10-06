<script setup lang="ts">
/**
 * /gigs — the dance scene's opportunity board.
 * Organizers/clients post open roles; artists post service offers.
 * V3 tropical style. Distinct from /artists (which is browse-a-directory):
 * gigs is post-driven — "I need X" or "I offer Y".
 */
import { ArrowRight, MapPin, Calendar, Wallet, Plus, Megaphone, Hand, X } from 'lucide-vue-next'

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

// tRPC client is provided by app/plugins/01.trpc.ts as `$trpc` (there is no
// `useTRPC` composable — calling it threw "useTRPC is not defined" on load).
const { $trpc } = useNuxtApp()
const { isSignedIn } = useAuth()

const route = useRoute()
const kindParam = (Array.isArray(route.query.kind) ? route.query.kind[0] : route.query.kind) || ''
const kindFilter = ref<'role' | 'offer' | ''>(kindParam === 'role' || kindParam === 'offer' ? kindParam : '')
const categoryFilter = ref('')

// Fetch gigs via the tRPC client (queries are GET; a raw POST to a query 405s).
// The tRPC client is client-only (relative '/api/trpc' URL, no SSR base — see
// app/pages/u/[username].vue), so this must never run during SSR: an SSR fetch
// fails with "Failed to parse URL", the error is hydrated, and the board stays
// empty until a filter changes. `server: false` runs it after hydration on the
// client, and `watch` refetches on every filter change.
const { data: gigs, status: gigsStatus, refresh: refreshGigs } = useAsyncData(
  'gigs-list',
  () => $trpc.gigs.list.query({
    kind: kindFilter.value || undefined,
    category: categoryFilter.value || undefined,
  }),
  { server: false, watch: [kindFilter, categoryFilter] },
)
// With server:false the SSR/hydration status is 'idle' — treat it as loading so
// the page never flashes "No gigs match" before the client fetch starts.
const loadingGigs = computed(() => gigsStatus.value === 'idle' || gigsStatus.value === 'pending')
const gigsFailed = computed(() => gigsStatus.value === 'error')

const allGigs = computed(() => gigs.value || [])
const categories = computed(() => Array.from(new Set(allGigs.value.map((g: any) => g.category))))

function safeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  return /^https?:\/\//i.test(url) ? url : undefined
}

function daysUntil(dateStr?: string | Date): { text: string; urgent: boolean } | null {
  if (!dateStr) return null
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  const diff = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { text: 'Closed', urgent: false }
  if (diff === 0) return { text: 'Closes today', urgent: true }
  if (diff <= 14) return { text: `Closes in ${diff}d`, urgent: true }
  return { text: `Closes in ${Math.ceil(diff / 7)}w`, urgent: false }
}

// Form state for creating offerings
const showForm = ref(false)
const formData = reactive({
  kind: 'offer' as 'role' | 'offer',
  category: '',
  title: '',
  posterName: '',
  posterType: 'Artist',
  location: '',
  styles: [] as string[],
  when: '',
  compensation: '',
  deadline: '',
  contactEmail: '',
  contactUrl: '',
  entityUrl: '',
})

// Reset posterType when kind changes so the default matches the available options
watch(() => formData.kind, (newKind) => {
  formData.posterType = newKind === 'role' ? 'Festival' : 'Artist'
})

const styleInput = ref('')
const submittingForm = ref(false)
const formError = ref('')
const formSuccess = ref(false)

function addStyle() {
  if (styleInput.value.trim()) {
    formData.styles.push(styleInput.value.trim())
    styleInput.value = ''
  }
}

function removeStyle(index: number) {
  formData.styles.splice(index, 1)
}

async function submitForm() {
  if (!isSignedIn.value) {
    formError.value = 'Please sign in to post a gig'
    return
  }

  formError.value = ''
  submittingForm.value = true

  try {
    // Mutation through the tRPC client so the session Bearer token is sent.
    // Empty optional fields become undefined (zod rejects '' for .url()).
    await $trpc.gigs.create.mutate({
      ...formData,
      styles: [...formData.styles],
      deadline: formData.deadline || undefined,
      contactUrl: formData.contactUrl || undefined,
      entityUrl: formData.entityUrl || undefined,
    })

    formSuccess.value = true
    formData.kind = 'offer'
    formData.category = ''
    formData.title = ''
    formData.posterName = ''
    formData.posterType = 'Artist'
    formData.location = ''
    formData.styles = []
    formData.when = ''
    formData.compensation = ''
    formData.deadline = ''
    formData.contactUrl = ''
    formData.entityUrl = ''
    styleInput.value = ''

    setTimeout(() => {
      formSuccess.value = false
      showForm.value = false
      refreshGigs()
    }, 2000)
  }
  catch (error: any) {
    formError.value = error?.message || 'Failed to create gig. Please try again.'
  }
  finally {
    submittingForm.value = false
  }
}

function gigMailto(g: any): string | null {
  if (!g.contactEmail) return null
  const applying = g.kind === 'role'
  const subject = applying
    ? `Applying: ${g.title} — ${g.posterName}`
    : `Booking enquiry: ${g.title} — ${g.posterName}`
  const body = applying
    ? `Hi ${g.posterName},\n\nI'd like to apply for "${g.title}" (${g.location}, ${g.when}).\n\nAbout me:\nExperience:\nLinks:\n`
    : `Hi ${g.posterName},\n\nI'd like to enquire about "${g.title}" (${g.location}, ${g.when}).\n\nMy event:\nDate:\nWhat I need:\n`
  return 'mailto:' + g.contactEmail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body)
}

// Track which gigs the user has clicked Apply/Contact on
const appliedGigs = ref(new Set<string>())

function handleApply(g: any) {
  useTrack().track('gig_cta_click', { action: g.kind === 'role' ? 'apply' : 'contact', gig_id: g.id })
  appliedGigs.value.add(g.id)
}

const accentColors: { [key: string]: string } = {
  'Teacher': '#dc2626',
  'DJ': '#0891b2',
  'MC': '#f59e0b',
  'Performer': '#a855f7',
  'Show': '#a855f7',
  'Photographer': '#ec4899',
  'Organizer': '#16a34a',
}

function getAccent(category: string): string {
  return accentColors[category] || '#3b1f0d'
}
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <!-- V3 header -->
    <SiteHeader />

    <!-- HERO -->
    <section class="relative">
      <div class="max-w-4xl mx-auto px-4 pt-12 pb-8 text-center">
        <div class="text-sm tracking-widest uppercase mb-3" style="color:#9a5614;">The two-way opportunity board</div>
        <h1 class="text-5xl sm:text-6xl leading-[0.98]" style="color:#3b1f0d;">
          Get booked. <em class="italic" style="color:#dc2626;">Hire talent.</em>
        </h1>
        <p class="mt-5 text-base sm:text-lg leading-relaxed max-w-xl mx-auto" style="color:#5b3a1d;">
          Find open roles at festivals and events. Post your services and book gigs. Organizers and artists — it all happens here.
        </p>

        <div class="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            v-if="isSignedIn"
            type="button"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider"
            style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow: 0 4px 0 -1px #b91c1c;"
            @click="showForm = !showForm"
          >
            <Plus class="w-4 h-4" /> {{ showForm ? 'Close' : 'Post a gig' }}
          </button>
          <a
            v-else
            href="/auth/signin"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider"
            style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow: 0 4px 0 -1px #b91c1c;"
          >
            <Plus class="w-4 h-4" /> Sign in to post
          </a>
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
            @click="kindFilter = opt.v as 'role' | 'offer' | ''"
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

    <!-- FORM (when user clicks Post a gig) -->
    <section v-if="showForm" class="max-w-2xl mx-auto px-4 mb-8 bg-white rounded-2xl p-6 border-2" style="border-color:#dc262633;">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold" style="color:#3b1f0d;">{{ formData.kind === 'role' ? 'Post an open role' : 'Offer your services' }}</h2>
        <button
          type="button"
          class="p-2 rounded-full hover:bg-gray-100"
          @click="showForm = false"
        >
          <X class="w-5 h-5" style="color:#3b1f0d;" />
        </button>
      </div>

      <form class="space-y-4" @submit.prevent="submitForm">
        <!-- Kind toggle -->
        <div>
          <label class="block text-sm font-bold mb-1" style="color:#5b3a1d;">What are you posting?</label>
          <div class="inline-flex rounded-full p-1 w-full" style="background:#fbf5ea; border:1px solid #3b1f0d22;">
            <button
              v-for="opt in [{ v: 'role' as const, label: 'I need someone', icon: Megaphone }, { v: 'offer' as const, label: 'I offer my services', icon: Hand }]"
              :key="opt.v"
              type="button"
              class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
              :style="formData.kind === opt.v
                ? { background: opt.v === 'role' ? '#dc2626' : '#16a34a', color: 'white' }
                : { background: 'transparent', color: '#5b3a1d' }"
              @click="formData.kind = opt.v"
            >
              <component :is="opt.icon" class="w-3.5 h-3.5" />
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Poster type (who is posting) -->
        <div>
          <label class="block text-sm font-bold mb-1" style="color:#5b3a1d;">{{ formData.kind === 'role' ? 'You are a…' : 'You are a…' }}</label>
          <select
            v-model="formData.posterType"
            required
            class="w-full px-3 py-2 rounded-lg border"
            style="border-color:#3b1f0d22; color:#3b1f0d;"
          >
            <template v-if="formData.kind === 'role'">
              <option value="Festival">Festival</option>
              <option value="Organizer">Organizer</option>
              <option value="School">School</option>
              <option value="Private event">Private event</option>
            </template>
            <template v-else>
              <option value="Artist">Artist</option>
              <option value="Teacher">Teacher</option>
              <option value="DJ">DJ</option>
              <option value="Photographer">Photographer</option>
              <option value="MC">MC</option>
            </template>
          </select>
        </div>

        <!-- Category -->
        <div>
          <label class="block text-sm font-bold mb-1" style="color:#5b3a1d;">{{ formData.kind === 'role' ? 'Role needed' : 'Service category' }}</label>
          <select
            v-model="formData.category"
            required
            class="w-full px-3 py-2 rounded-lg border"
            style="border-color:#3b1f0d22; color:#3b1f0d;"
          >
            <option value="">Select a category</option>
            <option value="Teacher">Teacher</option>
            <option value="DJ">DJ</option>
            <option value="MC">MC</option>
            <option value="Performer">Performer</option>
            <option value="Show">Show</option>
            <option value="Photographer">Photographer</option>
            <option value="Organizer">Organizer</option>
          </select>
        </div>

        <!-- Title -->
        <div>
          <label class="block text-sm font-bold mb-1" style="color:#5b3a1d;">{{ formData.kind === 'role' ? 'Role title' : 'Service title' }}</label>
          <input
            v-model="formData.title"
            type="text"
            required
            :placeholder="formData.kind === 'role' ? 'e.g., Salsa teacher needed for weekend festival' : 'e.g., Timba workshops for European festivals'"
            class="w-full px-3 py-2 rounded-lg border"
            style="border-color:#3b1f0d22; color:#3b1f0d;"
          />
        </div>

        <!-- Your name -->
        <div>
          <label class="block text-sm font-bold mb-1" style="color:#5b3a1d;">{{ formData.kind === 'role' ? 'Organisation / event name' : 'Your name' }}</label>
          <input
            v-model="formData.posterName"
            type="text"
            required
            :placeholder="formData.kind === 'role' ? 'e.g., Munich Salsa Festival' : 'Your name or artist name'"
            class="w-full px-3 py-2 rounded-lg border"
            style="border-color:#3b1f0d22; color:#3b1f0d;"
          />
        </div>

        <!-- Location -->
        <div>
          <label class="block text-sm font-bold mb-1" style="color:#5b3a1d;">Location or base</label>
          <input
            v-model="formData.location"
            type="text"
            required
            placeholder="e.g., Munich, Germany"
            class="w-full px-3 py-2 rounded-lg border"
            style="border-color:#3b1f0d22; color:#3b1f0d;"
          />
        </div>

        <!-- Styles -->
        <div>
          <label class="block text-sm font-bold mb-1" style="color:#5b3a1d;">Dance styles</label>
          <div class="flex gap-2 mb-2">
            <input
              v-model="styleInput"
              type="text"
              placeholder="Add style (e.g., Timba)"
              class="flex-1 px-3 py-2 rounded-lg border"
              style="border-color:#3b1f0d22; color:#3b1f0d;"
              @keyup.enter="addStyle"
            />
            <button
              type="button"
              class="px-4 py-2 rounded-lg font-bold text-white"
              style="background:#dc2626;"
              @click="addStyle"
            >
              Add
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(style, idx) in formData.styles"
              :key="idx"
              class="px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2"
              style="background:#dc262618; color:#dc2626;"
            >
              {{ style }}
              <button
                type="button"
                class="hover:opacity-70"
                @click="removeStyle(idx)"
              >
                <X class="w-3 h-3" />
              </button>
            </span>
          </div>
        </div>

        <!-- Availability / When -->
        <div>
          <label class="block text-sm font-bold mb-1" style="color:#5b3a1d;">{{ formData.kind === 'role' ? 'When is the event?' : 'When available' }}</label>
          <input
            v-model="formData.when"
            type="text"
            required
            :placeholder="formData.kind === 'role' ? 'e.g., May 23–25, 2027' : 'e.g., Weekends, Booking 2026–27'"
            class="w-full px-3 py-2 rounded-lg border"
            style="border-color:#3b1f0d22; color:#3b1f0d;"
          />
        </div>

        <!-- Compensation -->
        <div>
          <label class="block text-sm font-bold mb-1" style="color:#5b3a1d;">{{ formData.kind === 'role' ? 'Budget / compensation offered' : 'Compensation / rate' }}</label>
          <input
            v-model="formData.compensation"
            type="text"
            required
            :placeholder="formData.kind === 'role' ? 'e.g., €500 + travel, Negotiable' : 'e.g., From €200/hour, On request'"
            class="w-full px-3 py-2 rounded-lg border"
            style="border-color:#3b1f0d22; color:#3b1f0d;"
          />
        </div>

        <!-- Contact email -->
        <div>
          <label class="block text-sm font-bold mb-1" style="color:#5b3a1d;">Contact email</label>
          <input
            v-model="formData.contactEmail"
            type="email"
            required
            class="w-full px-3 py-2 rounded-lg border"
            style="border-color:#3b1f0d22; color:#3b1f0d;"
          />
        </div>

        <!-- Website (optional) -->
        <div>
          <label class="block text-sm font-bold mb-1" style="color:#5b3a1d;">Website or portfolio (optional)</label>
          <input
            v-model="formData.contactUrl"
            type="url"
            placeholder="https://..."
            class="w-full px-3 py-2 rounded-lg border"
            style="border-color:#3b1f0d22; color:#3b1f0d;"
          />
        </div>

        <!-- Error message -->
        <div v-if="formError" class="p-3 rounded-lg text-sm font-bold" style="background:#dc262618; color:#dc2626;">
          {{ formError }}
        </div>

        <!-- Success message -->
        <div v-if="formSuccess" class="p-3 rounded-lg text-sm font-bold" style="background:#16a34a18; color:#16a34a;">
          ✓ Gig posted! It will appear on the board shortly.
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="submittingForm"
          class="w-full px-6 py-3 rounded-full text-white font-bold uppercase tracking-wider"
          style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow: 0 4px 0 -1px #b91c1c;"
        >
          {{ submittingForm ? 'Posting...' : formData.kind === 'role' ? 'Post open role' : 'Post your offering' }}
        </button>
      </form>
    </section>

    <!-- BOARD -->
    <section class="max-w-4xl mx-auto px-4 pb-16">
      <div class="flex items-baseline justify-between mb-6">
        <h2 class="text-2xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
          {{ kindFilter === 'role' ? 'Open roles' : kindFilter === 'offer' ? 'Services offered' : 'All gigs' }}
        </h2>
        <span class="text-xs" style="color:#9a5614; font-family:'Caveat', cursive; font-size:18px;">
          — {{ allGigs.length }} gig{{ allGigs.length === 1 ? '' : 's' }}
        </span>
      </div>

      <div v-if="loadingGigs" class="text-center py-14">
        <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">Loading gigs...</p>
      </div>

      <div v-else-if="gigsFailed" class="text-center py-14">
        <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">Couldn't load gigs. <button type="button" class="underline" @click="refreshGigs()">Try again</button></p>
      </div>

      <div v-else-if="!allGigs.length" class="text-center py-14 rounded-2xl border-2 border-dashed" style="border-color:#3b1f0d33; background:rgba(255,255,255,0.5);">
        <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">No gigs match your filters yet.</p>
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2">
        <div
          v-for="g in allGigs"
          :key="g.id"
          class="rounded-2xl bg-white border p-5 flex flex-col transition-all hover:-translate-y-1"
          :style="{ borderColor: getAccent(g.category) + '55', boxShadow: '0 1px 0 ' + getAccent(g.category) + '22, 0 8px 22px rgba(59,31,18,0.05)' }"
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
            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" :style="{ background: getAccent(g.category) + '18', color: getAccent(g.category) }">
              {{ g.category }}
            </span>
          </div>

          <h3 class="text-lg font-bold leading-tight" style="color:#3b1f0d; font-family:'Playfair Display', serif;">
            {{ g.title }}
          </h3>

          <!-- Poster -->
          <div class="mt-1 text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            <span class="font-bold" :style="{ color: getAccent(g.category) }">{{ g.posterName }}</span>
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
              :style="{ background: getAccent(g.category) + '14', color: getAccent(g.category) }"
            >{{ s }}</span>
          </div>

          <!-- Confirmation banner -->
          <div
            v-if="appliedGigs.has(g.id)"
            class="mt-3 p-3 rounded-lg text-xs font-bold"
            style="background:#16a34a14; color:#16a34a; font-family: system-ui, sans-serif; border: 1px solid #16a34a33;"
          >
            ✓ Email draft opened — send it to reach {{ g.posterName }} directly.
            <template v-if="safeHref(g.contactUrl)">
              You can also visit <a :href="safeHref(g.contactUrl)" target="_blank" rel="noopener" class="underline">their profile</a>.
            </template>
          </div>

          <!-- Footer -->
          <div class="mt-auto pt-4 flex items-center justify-between gap-3">
            <span
              v-if="g.deadline && daysUntil(g.deadline)"
              class="text-xs font-bold"
              :style="{ color: daysUntil(g.deadline)!.urgent ? '#dc2626' : '#9a5614', fontFamily: 'system-ui, sans-serif' }"
            >
              {{ daysUntil(g.deadline)!.text }}
            </span>
            <span v-else />
            <div class="flex items-center gap-2">
              <a
                v-if="safeHref(g.contactUrl)"
                :href="safeHref(g.contactUrl)"
                target="_blank"
                rel="noopener"
                class="inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs font-bold uppercase tracking-wider border"
                :style="{ color: getAccent(g.category), borderColor: getAccent(g.category) + '55' }"
              >
                Profile
              </a>
              <a
                v-if="gigMailto(g)"
                :href="gigMailto(g)!"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-bold uppercase tracking-wider"
                :style="{ background: getAccent(g.category), boxShadow: '0 3px 0 -1px ' + getAccent(g.category) + 'cc' }"
                @click="handleApply(g)"
              >
                {{ g.kind === 'role' ? 'Apply' : 'Contact' }} <ArrowRight class="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <SiteFooter />
  </div>
</template>
