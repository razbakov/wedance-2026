<script setup lang="ts">
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  Users,
  Music,
  Ticket,
  Eye,
  GripVertical,
  Instagram,
  Globe,
  Facebook,
  Youtube,
  Image,
} from 'lucide-vue-next'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — Create festival',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

const router = useRouter()

// Step management
const steps = [
  { id: 'basics', label: 'Basics', icon: Calendar },
  { id: 'venue', label: 'Venue', icon: MapPin },
  { id: 'lineup', label: 'Lineup', icon: Users },
  { id: 'schedule', label: 'Schedule', icon: Music },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'preview', label: 'Preview', icon: Eye },
] as const

type StepId = typeof steps[number]['id']
const currentStep = ref<StepId>('basics')
const currentStepIndex = computed(() => steps.findIndex(s => s.id === currentStep.value))

function goToStep(stepId: StepId) {
  currentStep.value = stepId
}
function nextStep() {
  if (currentStepIndex.value < steps.length - 1) {
    currentStep.value = steps[currentStepIndex.value + 1].id
    window.scrollTo(0, 0)
  }
}
function prevStep() {
  if (currentStepIndex.value > 0) {
    currentStep.value = steps[currentStepIndex.value - 1].id
    window.scrollTo(0, 0)
  }
}

// ---- Form Data ----

// Step 1: Basics
const festival = reactive({
  name: '',
  slug: '',
  startDate: '',
  endDate: '',
  description: '',
  logo: '',
  accentColor: '#e11d48',
  socialLinks: [] as { platform: string; url: string }[],
})

// Auto-generate slug from name
watch(() => festival.name, (name) => {
  festival.slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
})

function addSocialLink() {
  festival.socialLinks.push({ platform: 'instagram', url: '' })
}
function removeSocialLink(index: number) {
  festival.socialLinks.splice(index, 1)
}

const socialPlatforms = [
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'website', label: 'Website', icon: Globe },
]

// Step 2: Venue
const venue = reactive({
  name: '',
  address: '',
  rooms: [''],
  practicalInfo: [''],
})

function addRoom() {
  venue.rooms.push('')
}
function removeRoom(index: number) {
  venue.rooms.splice(index, 1)
}

function addPracticalInfo() {
  venue.practicalInfo.push('')
}
function removePracticalInfo(index: number) {
  venue.practicalInfo.splice(index, 1)
}

// Step 3: Lineup (Teachers)
interface EditorTeacher {
  id: string
  name: string
  photo: string
  bio: string
  styles: string
  videoUrl: string
  instagram: string
}

const teachers = ref<EditorTeacher[]>([])

function addTeacher() {
  teachers.value.push({
    id: crypto.randomUUID(),
    name: '',
    photo: '',
    bio: '',
    styles: '',
    videoUrl: '',
    instagram: '',
  })
}
function removeTeacher(index: number) {
  teachers.value.splice(index, 1)
}

// Step 4: Schedule (Workshops)
interface EditorWorkshop {
  id: string
  title: string
  day: string
  time: string
  duration: number
  room: string
  style: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  teacherId: string
  type: 'workshop' | 'party'
  description: string
  venue: string
}

const workshops = ref<EditorWorkshop[]>([])

const days = computed(() => {
  if (!festival.startDate || !festival.endDate) return []
  const result: string[] = []
  const start = new Date(festival.startDate)
  const end = new Date(festival.endDate)
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    result.push(dayNames[d.getDay()])
  }
  return result
})

const rooms = computed(() => venue.rooms.filter(Boolean))

const styles = computed(() => {
  const allStyles = teachers.value.flatMap(t => t.styles.split(',').map(s => s.trim()).filter(Boolean))
  return [...new Set(allStyles)]
})

function addWorkshop() {
  workshops.value.push({
    id: crypto.randomUUID(),
    title: '',
    day: days.value[0] || '',
    time: '10:00',
    duration: 60,
    room: rooms.value[0] || '',
    style: styles.value[0] || '',
    level: 'Intermediate',
    teacherId: teachers.value[0]?.id || '',
    type: 'workshop',
    description: '',
    venue: '',
  })
}
function removeWorkshop(index: number) {
  workshops.value.splice(index, 1)
}

// Step 5: Tickets
interface EditorTicket {
  id: string
  name: string
  price: number
  description: string
  workshopCount: number | null
  includesParty: boolean
  soldOut: boolean
}

const tickets = ref<EditorTicket[]>([])
const ticketUrl = ref('')

function addTicket() {
  tickets.value.push({
    id: crypto.randomUUID(),
    name: '',
    price: 0,
    description: '',
    workshopCount: null,
    includesParty: false,
    soldOut: false,
  })
}
function removeTicket(index: number) {
  tickets.value.splice(index, 1)
}

// Summary counts for preview
const workshopCount = computed(() => workshops.value.filter(w => w.type === 'workshop').length)
const partyCount = computed(() => workshops.value.filter(w => w.type === 'party').length)

// Publish
const isPublishing = ref(false)
const isPublished = ref(false)

async function publish() {
  isPublishing.value = true
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1500))
  isPublishing.value = false
  isPublished.value = true
}

// V3 shared field styles. Kept as class strings so field usage
// throughout the template doesn't need to change — every input
// inherits the tropical palette + Playfair labels from these.
const inputClass = 'block h-11 w-full rounded-xl border border-[#3b1f0d33] bg-white px-4 text-sm text-[#3b1f0d] outline-none transition-all placeholder:text-[#9a5614]/60 focus:border-[#dc2626] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.15)] font-sans'
const textareaClass = 'block w-full rounded-xl border border-[#3b1f0d33] bg-white px-4 py-3 text-sm text-[#3b1f0d] outline-none transition-all placeholder:text-[#9a5614]/60 focus:border-[#dc2626] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.15)] min-h-[96px] resize-y font-sans'
const selectClass = 'block h-11 w-full rounded-xl border border-[#3b1f0d33] bg-white px-4 text-sm text-[#3b1f0d] outline-none transition-all focus:border-[#dc2626] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.15)] appearance-none font-sans'
const labelClass = 'text-[10px] uppercase tracking-[0.25em] font-bold mb-2 block text-[#9a5614]'
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <!-- V3 site header — same as / , /festivals, /organizers, etc. -->
    <header class="border-b" style="border-color:#3b1f0d33;">
      <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-baseline gap-2">
          <span class="font-bold text-lg">WeDance</span>
        </NuxtLink>
        <nav class="flex items-center gap-4 text-sm">
          <NuxtLink to="/festivals" class="italic hover:underline">Festivals</NuxtLink>
          <NuxtLink to="/cities" class="italic hover:underline">Cities</NuxtLink>
          <NuxtLink to="/for-events" class="italic hover:underline hidden sm:inline">Private events</NuxtLink>
          <NuxtLink to="/organizers" class="italic hover:underline hidden sm:inline">For organizers</NuxtLink>
        </nav>
      </div>
    </header>

    <!-- Create-flow action bar (sticky) -->
    <div class="sticky top-0 z-20 border-b backdrop-blur-sm" style="background:rgba(251, 245, 234, 0.95); border-color:#3b1f0d22;">
      <div class="max-w-4xl mx-auto px-4 flex items-center justify-between h-14 gap-3">
        <button
          type="button"
          class="inline-flex items-center gap-2 text-sm italic hover:underline"
          style="color:#5b3a1d; font-family:'Playfair Display', serif;"
          @click="router.push('/organizers')"
        >
          <ArrowLeft class="w-4 h-4" />
          Back
        </button>
        <div class="text-xs uppercase tracking-[0.3em] font-bold" style="color:#9a5614;">
          Create festival
        </div>
        <button
          v-if="currentStep === 'preview'"
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-bold uppercase tracking-wider"
          :disabled="isPublishing || isPublished"
          style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow: 0 3px 0 -1px #b91c1c;"
          @click="publish"
        >
          {{ isPublished ? 'Published!' : isPublishing ? 'Publishing…' : 'Publish' }}
        </button>
        <div v-else class="w-14" />
      </div>

      <!-- Step indicator -->
      <nav class="overflow-x-auto border-t" style="border-color:#3b1f0d0d;">
        <div class="max-w-4xl mx-auto px-4 flex">
          <button
            v-for="(step, i) in steps"
            :key="step.id"
            type="button"
            class="flex items-center gap-2 px-4 py-3 text-xs italic whitespace-nowrap transition-all border-b-2"
            :style="step.id === currentStep
              ? { borderColor: '#dc2626', color: '#dc2626', fontFamily: 'Playfair Display, serif', fontWeight: 700 }
              : { borderColor: 'transparent', color: i < currentStepIndex ? '#3b1f0d' : '#9a5614', fontFamily: 'Playfair Display, serif' }"
            @click="goToStep(step.id)"
          >
            <div
              class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0"
              :style="i < currentStepIndex
                ? { background: '#16a34a', color: 'white' }
                : step.id === currentStep
                  ? { background: '#dc2626', color: 'white' }
                  : { background: 'white', color: '#9a5614', border: '1.5px solid #3b1f0d22' }"
            >
              <Check v-if="i < currentStepIndex" class="w-3 h-3" style="stroke-width:2.5;" />
              <span v-else style="font-family: system-ui, sans-serif;">{{ i + 1 }}</span>
            </div>
            {{ step.label }}
          </button>
        </div>
      </nav>
    </div>

    <!-- Form content -->
    <div class="max-w-3xl mx-auto px-4 py-8 pb-32">

      <!-- Step 1: Basics -->
      <div v-if="currentStep === 'basics'" class="space-y-6">
        <div>
          <h2 class="text-2xl leading-tight font-black mb-1" style="font-family:'Playfair Display', serif; color:#3b1f0d;">Festival Details</h2>
          <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">Start with the essentials — name, dates, and description.</p>
        </div>

        <div class="space-y-4">
          <div>
            <label :class="labelClass">Festival name *</label>
            <input v-model="festival.name" :class="inputClass" type="text" required placeholder="e.g. Salsa Open Berlin 2026" />
          </div>

          <div>
            <label :class="labelClass">URL slug</label>
            <div class="flex items-center gap-0">
              <span
                class="text-xs px-3 h-11 flex items-center rounded-l-xl border border-r-0"
                style="color:#5b3a1d; background:#3b1f0d0a; border-color:#3b1f0d33; font-family: system-ui, sans-serif;"
              >wedance.vip/festivals/</span>
              <input v-model="festival.slug" :class="[inputClass, 'rounded-l-none']" type="text" placeholder="salsa-open-berlin-2026" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label :class="labelClass">Start date *</label>
              <input v-model="festival.startDate" :class="inputClass" type="date" required />
            </div>
            <div>
              <label :class="labelClass">End date *</label>
              <input v-model="festival.endDate" :class="inputClass" type="date" required />
            </div>
          </div>

          <div>
            <label :class="labelClass">Description</label>
            <textarea v-model="festival.description" :class="textareaClass" placeholder="Tell dancers what makes your festival special..." rows="4" />
          </div>

          <div>
            <label :class="labelClass">Logo URL</label>
            <input v-model="festival.logo" :class="inputClass" type="url" placeholder="https://..." />
            <p style="color:#9a5614; font-family: system-ui, sans-serif;" class="text-xs mt-1">Square image recommended (200x200px or larger)</p>
          </div>

          <div>
            <label :class="labelClass">Accent color</label>
            <div class="flex items-center gap-3">
              <input v-model="festival.accentColor" type="color" class="w-9 h-9 rounded cursor-pointer border-0 p-0" />
              <input v-model="festival.accentColor" :class="inputClass" class="max-w-32" type="text" placeholder="#e11d48" />
            </div>
          </div>
        </div>

        <!-- Social links -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <label :class="labelClass" class="mb-0">Social links</label>
            <button class="inline-flex items-center gap-1 text-xs italic hover:underline" style="color:#dc2626; font-family:'Playfair Display', serif;" @click="addSocialLink">
              <Plus class="w-3 h-3" /> Add link
            </button>
          </div>
          <div class="space-y-2">
            <div v-for="(link, i) in festival.socialLinks" :key="i" class="flex items-center gap-2">
              <select v-model="link.platform" :class="selectClass" class="max-w-32">
                <option v-for="p in socialPlatforms" :key="p.value" :value="p.value">{{ p.label }}</option>
              </select>
              <input v-model="link.url" :class="inputClass" type="url" placeholder="https://..." />
              <button style="color:#9a5614;" class="hover:!text-[#dc2626] shrink-0 p-1" @click="removeSocialLink(i)">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
            <p v-if="!festival.socialLinks.length" style="color:#9a5614; font-family: system-ui, sans-serif;" class="text-xs">No social links yet.</p>
          </div>
        </div>
      </div>

      <!-- Step 2: Venue -->
      <div v-if="currentStep === 'venue'" class="space-y-6">
        <div>
          <h2 class="text-2xl leading-tight font-black mb-1" style="font-family:'Playfair Display', serif; color:#3b1f0d;">Venue</h2>
          <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">Where is the festival happening?</p>
        </div>

        <div class="space-y-4">
          <div>
            <label :class="labelClass">Venue name *</label>
            <input v-model="venue.name" :class="inputClass" type="text" required placeholder="e.g. Alte Munze" />
          </div>

          <div>
            <label :class="labelClass">Address *</label>
            <input v-model="venue.address" :class="inputClass" type="text" required placeholder="e.g. Molkenmarkt 2, 10179 Berlin, Germany" />
          </div>
        </div>

        <!-- Rooms -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <label :class="labelClass" class="mb-0">Rooms</label>
            <button class="inline-flex items-center gap-1 text-xs italic hover:underline" style="color:#dc2626; font-family:'Playfair Display', serif;" @click="addRoom">
              <Plus class="w-3 h-3" /> Add room
            </button>
          </div>
          <p style="color:#9a5614; font-family: system-ui, sans-serif;" class="text-xs mb-2">List the rooms/halls where workshops take place. These will appear as options in the schedule.</p>
          <div class="space-y-2">
            <div v-for="(_, i) in venue.rooms" :key="i" class="flex items-center gap-2">
              <input v-model="venue.rooms[i]" :class="inputClass" type="text" placeholder="e.g. Main Hall" />
              <button style="color:#9a5614;" class="hover:!text-[#dc2626] shrink-0 p-1" @click="removeRoom(i)">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Practical info -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <label :class="labelClass" class="mb-0">Practical info</label>
            <button class="inline-flex items-center gap-1 text-xs italic hover:underline" style="color:#dc2626; font-family:'Playfair Display', serif;" @click="addPracticalInfo">
              <Plus class="w-3 h-3" /> Add item
            </button>
          </div>
          <div class="space-y-2">
            <div v-for="(_, i) in venue.practicalInfo" :key="i" class="flex items-center gap-2">
              <input v-model="venue.practicalInfo[i]" :class="inputClass" type="text" placeholder="e.g. Nearest metro: U2 Klosterstrasse" />
              <button style="color:#9a5614;" class="hover:!text-[#dc2626] shrink-0 p-1" @click="removePracticalInfo(i)">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Lineup -->
      <div v-if="currentStep === 'lineup'" class="space-y-6">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-2xl leading-tight font-black mb-1" style="font-family:'Playfair Display', serif; color:#3b1f0d;">Lineup</h2>
            <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">Add the teachers and DJs performing at your festival.</p>
          </div>
          <Button size="sm" variant="outline" class="gap-1 shrink-0" @click="addTeacher">
            <Plus class="w-3.5 h-3.5" /> Add Artist
          </Button>
        </div>

        <div v-if="!teachers.length" class="text-center py-12 border rounded-lg border-dashed">
          <Users class="w-8 h-8 mx-auto mb-2" style="color:#9a5614;" />
          <p style="color:#5b3a1d; font-family: system-ui, sans-serif;" class="text-sm mb-3">No artists added yet</p>
          <Button size="sm" variant="outline" @click="addTeacher">Add your first artist</Button>
        </div>

        <div v-for="(teacher, i) in teachers" :key="teacher.id" class="border rounded-lg p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">{{ teacher.name || `Artist ${i + 1}` }}</h3>
            <button style="color:#9a5614;" class="hover:!text-[#dc2626] p-1" @click="removeTeacher(i)">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label :class="labelClass">Name *</label>
              <input v-model="teacher.name" :class="inputClass" type="text" placeholder="e.g. Carlos Rivera" />
            </div>
            <div>
              <label :class="labelClass">Styles</label>
              <input v-model="teacher.styles" :class="inputClass" type="text" placeholder="e.g. Salsa, Timba" />
            </div>
          </div>

          <div>
            <label :class="labelClass">Bio</label>
            <textarea v-model="teacher.bio" :class="textareaClass" placeholder="Short bio..." rows="2" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label :class="labelClass">Photo URL</label>
              <input v-model="teacher.photo" :class="inputClass" type="url" placeholder="https://..." />
            </div>
            <div>
              <label :class="labelClass">Video URL</label>
              <input v-model="teacher.videoUrl" :class="inputClass" type="url" placeholder="https://youtube.com/..." />
            </div>
          </div>

          <div>
            <label :class="labelClass">Instagram</label>
            <input v-model="teacher.instagram" :class="inputClass" type="url" placeholder="https://instagram.com/..." />
          </div>
        </div>
      </div>

      <!-- Step 4: Schedule -->
      <div v-if="currentStep === 'schedule'" class="space-y-6">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-2xl leading-tight font-black mb-1" style="font-family:'Playfair Display', serif; color:#3b1f0d;">Schedule</h2>
            <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
              Add workshops and parties.
              <span v-if="!days.length" class="text-destructive">Set dates in Basics first.</span>
            </p>
          </div>
          <Button size="sm" variant="outline" class="gap-1 shrink-0" :disabled="!days.length" @click="addWorkshop">
            <Plus class="w-3.5 h-3.5" /> Add Workshop
          </Button>
        </div>

        <div v-if="!workshops.length" class="text-center py-12 border rounded-lg border-dashed">
          <Music class="w-8 h-8 mx-auto mb-2" style="color:#9a5614;" />
          <p style="color:#5b3a1d; font-family: system-ui, sans-serif;" class="text-sm mb-3">No workshops added yet</p>
          <Button size="sm" variant="outline" :disabled="!days.length" @click="addWorkshop">Add your first workshop</Button>
        </div>

        <div v-for="(ws, i) in workshops" :key="ws.id" class="border rounded-lg p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">{{ ws.title || `Workshop ${i + 1}` }}</h3>
            <div class="flex items-center gap-2">
              <Badge :variant="ws.type === 'party' ? 'secondary' : 'default'" class="text-[10px]">
                {{ ws.type }}
              </Badge>
              <button style="color:#9a5614;" class="hover:!text-[#dc2626] p-1" @click="removeWorkshop(i)">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label :class="labelClass">Title *</label>
              <input v-model="ws.title" :class="inputClass" type="text" placeholder="e.g. Salsa Fundamentals" />
            </div>
            <div>
              <label :class="labelClass">Type</label>
              <select v-model="ws.type" :class="selectClass">
                <option value="workshop">Workshop</option>
                <option value="party">Party</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-4 gap-3">
            <div>
              <label :class="labelClass">Day</label>
              <select v-model="ws.day" :class="selectClass">
                <option v-for="d in days" :key="d" :value="d">{{ d }}</option>
              </select>
            </div>
            <div>
              <label :class="labelClass">Time</label>
              <input v-model="ws.time" :class="inputClass" type="time" />
            </div>
            <div>
              <label :class="labelClass">Duration (min)</label>
              <input v-model.number="ws.duration" :class="inputClass" type="number" min="15" step="15" />
            </div>
            <div>
              <label :class="labelClass">Room</label>
              <select v-if="rooms.length" v-model="ws.room" :class="selectClass">
                <option value="">— Select —</option>
                <option v-for="r in rooms" :key="r" :value="r">{{ r }}</option>
              </select>
              <input v-else v-model="ws.room" :class="inputClass" type="text" placeholder="Add rooms in Venue step" />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label :class="labelClass">Style</label>
              <input v-model="ws.style" :class="inputClass" type="text" placeholder="Salsa" list="style-options" />
              <datalist id="style-options">
                <option v-for="s in styles" :key="s" :value="s" />
              </datalist>
            </div>
            <div>
              <label :class="labelClass">Level</label>
              <select v-model="ws.level" :class="selectClass">
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label :class="labelClass">Teacher</label>
              <select v-model="ws.teacherId" :class="selectClass">
                <option value="">— None —</option>
                <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.name || 'Unnamed' }}</option>
              </select>
            </div>
          </div>

          <div>
            <label :class="labelClass">Description</label>
            <textarea v-model="ws.description" :class="textareaClass" placeholder="Optional workshop description..." rows="2" />
          </div>

          <div>
            <label :class="labelClass">Alternative venue</label>
            <input v-model="ws.venue" :class="inputClass" type="text" placeholder="Leave empty if same as main venue" />
          </div>
        </div>
      </div>

      <!-- Step 5: Tickets -->
      <div v-if="currentStep === 'tickets'" class="space-y-6">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-2xl leading-tight font-black mb-1" style="font-family:'Playfair Display', serif; color:#3b1f0d;">Tickets</h2>
            <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">Define your ticket options. We'll recommend the best fit to dancers.</p>
          </div>
          <Button size="sm" variant="outline" class="gap-1 shrink-0" @click="addTicket">
            <Plus class="w-3.5 h-3.5" /> Add Ticket
          </Button>
        </div>

        <div>
          <label :class="labelClass">Ticket purchase URL</label>
          <input v-model="ticketUrl" :class="inputClass" type="url" placeholder="https://your-ticket-page.com" />
          <p style="color:#9a5614; font-family: system-ui, sans-serif;" class="text-xs mt-1">Where dancers go to buy tickets (your website or ticket platform)</p>
        </div>

        <div v-if="!tickets.length" class="text-center py-12 border rounded-lg border-dashed">
          <Ticket class="w-8 h-8 mx-auto mb-2" style="color:#9a5614;" />
          <p style="color:#5b3a1d; font-family: system-ui, sans-serif;" class="text-sm mb-3">No ticket options added yet</p>
          <Button size="sm" variant="outline" @click="addTicket">Add your first ticket</Button>
        </div>

        <div v-for="(ticket, i) in tickets" :key="ticket.id" class="border rounded-lg p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold">{{ ticket.name || `Ticket ${i + 1}` }}</h3>
            <button style="color:#9a5614;" class="hover:!text-[#dc2626] p-1" @click="removeTicket(i)">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label :class="labelClass">Name *</label>
              <input v-model="ticket.name" :class="inputClass" type="text" placeholder="e.g. Full Pass + Party" />
            </div>
            <div>
              <label :class="labelClass">Price (EUR) *</label>
              <input v-model.number="ticket.price" :class="inputClass" type="number" min="0" step="1" placeholder="100" />
            </div>
          </div>

          <div>
            <label :class="labelClass">Description</label>
            <input v-model="ticket.description" :class="inputClass" type="text" placeholder="e.g. All 5 workshops + Saturday Party" />
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label :class="labelClass">Max workshops</label>
              <input v-model.number="ticket.workshopCount" :class="inputClass" type="number" min="0" placeholder="Unlimited" />
              <p style="color:#9a5614; font-family: system-ui, sans-serif;" class="text-xs mt-0.5">Leave empty for unlimited</p>
            </div>
            <div class="flex items-end pb-1">
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input v-model="ticket.includesParty" type="checkbox" class="rounded" style="border:1px solid #3b1f0d33; accent-color:#dc2626;" />
                Includes party
              </label>
            </div>
            <div class="flex items-end pb-1">
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input v-model="ticket.soldOut" type="checkbox" class="rounded" style="border:1px solid #3b1f0d33; accent-color:#dc2626;" />
                Sold out
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 6: Preview -->
      <div v-if="currentStep === 'preview'" class="space-y-6">
        <div>
          <h2 class="text-2xl leading-tight font-black mb-1" style="font-family:'Playfair Display', serif; color:#3b1f0d;">Preview & Publish</h2>
          <p class="text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">Review your festival before going live.</p>
        </div>

        <!-- Published success -->
        <div v-if="isPublished" class="text-center py-12 border rounded-lg bg-green-50 border-green-200">
          <Check class="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 class="text-lg font-semibold mb-1">Your festival is live!</h3>
          <p style="color:#5b3a1d; font-family: system-ui, sans-serif;" class="text-sm mb-4">
            Dancers can now find and plan for <strong>{{ festival.name }}</strong>
          </p>
          <div class="flex items-center justify-center gap-3">
            <Button variant="outline" as="a" :href="`/festivals/${festival.slug}`">
              View Festival Page
            </Button>
            <Button variant="outline" @click="router.push('/organizers')">
              Back to Dashboard
            </Button>
          </div>
        </div>

        <!-- Preview summary -->
        <div v-else class="space-y-4">
          <!-- Basics summary -->
          <div class="rounded-2xl bg-white border p-5" style="border-color:#3b1f0d22; box-shadow: 0 1px 0 #3b1f0d0a, 0 6px 18px rgba(59,31,18,0.04);">
            <div>
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-semibold">Basics</h3>
                <button class="text-xs italic hover:underline" style="color:#dc2626; font-family:'Playfair Display', serif;" @click="goToStep('basics')">Edit</button>
              </div>
              <div class="grid grid-cols-2 gap-y-1 text-sm">
                <span style="color:#9a5614; font-family: system-ui, sans-serif;">Name</span>
                <span>{{ festival.name || '—' }}</span>
                <span style="color:#9a5614; font-family: system-ui, sans-serif;">Dates</span>
                <span>{{ festival.startDate && festival.endDate ? `${festival.startDate} to ${festival.endDate}` : '—' }}</span>
                <span style="color:#9a5614; font-family: system-ui, sans-serif;">Social links</span>
                <span>{{ festival.socialLinks.length || 0 }} links</span>
              </div>
            </div>
          </div>

          <!-- Venue summary -->
          <div class="rounded-2xl bg-white border p-5" style="border-color:#3b1f0d22; box-shadow: 0 1px 0 #3b1f0d0a, 0 6px 18px rgba(59,31,18,0.04);">
            <div>
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-semibold">Venue</h3>
                <button class="text-xs italic hover:underline" style="color:#dc2626; font-family:'Playfair Display', serif;" @click="goToStep('venue')">Edit</button>
              </div>
              <div class="grid grid-cols-2 gap-y-1 text-sm">
                <span style="color:#9a5614; font-family: system-ui, sans-serif;">Name</span>
                <span>{{ venue.name || '—' }}</span>
                <span style="color:#9a5614; font-family: system-ui, sans-serif;">Address</span>
                <span>{{ venue.address || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- Lineup summary -->
          <div class="rounded-2xl bg-white border p-5" style="border-color:#3b1f0d22; box-shadow: 0 1px 0 #3b1f0d0a, 0 6px 18px rgba(59,31,18,0.04);">
            <div>
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-semibold">Lineup</h3>
                <button class="text-xs italic hover:underline" style="color:#dc2626; font-family:'Playfair Display', serif;" @click="goToStep('lineup')">Edit</button>
              </div>
              <p class="text-sm">
                <strong>{{ teachers.length }}</strong> {{ teachers.length === 1 ? 'artist' : 'artists' }}
                <span v-if="teachers.length" style="color:#9a5614; font-family: system-ui, sans-serif;">
                  — {{ teachers.map(t => t.name).filter(Boolean).join(', ') }}
                </span>
              </p>
            </div>
          </div>

          <!-- Schedule summary -->
          <div class="rounded-2xl bg-white border p-5" style="border-color:#3b1f0d22; box-shadow: 0 1px 0 #3b1f0d0a, 0 6px 18px rgba(59,31,18,0.04);">
            <div>
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-semibold">Schedule</h3>
                <button class="text-xs italic hover:underline" style="color:#dc2626; font-family:'Playfair Display', serif;" @click="goToStep('schedule')">Edit</button>
              </div>
              <p class="text-sm">
                <strong>{{ workshopCount }}</strong> {{ workshopCount === 1 ? 'workshop' : 'workshops' }},
                <strong>{{ partyCount }}</strong> {{ partyCount === 1 ? 'party' : 'parties' }}
                <span v-if="days.length" style="color:#9a5614; font-family: system-ui, sans-serif;">across {{ days.length }} days</span>
              </p>
            </div>
          </div>

          <!-- Tickets summary -->
          <div class="rounded-2xl bg-white border p-5" style="border-color:#3b1f0d22; box-shadow: 0 1px 0 #3b1f0d0a, 0 6px 18px rgba(59,31,18,0.04);">
            <div>
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-semibold">Tickets</h3>
                <button class="text-xs italic hover:underline" style="color:#dc2626; font-family:'Playfair Display', serif;" @click="goToStep('tickets')">Edit</button>
              </div>
              <p class="text-sm">
                <strong>{{ tickets.length }}</strong> {{ tickets.length === 1 ? 'option' : 'options' }}
                <span v-if="tickets.length" style="color:#9a5614; font-family: system-ui, sans-serif;">
                  — {{ tickets.filter(t => !t.soldOut).map(t => `${t.name} €${t.price}`).join(', ') }}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom navigation -->
    <div v-if="!isPublished" class="fixed bottom-0 left-0 right-0 border-t z-20 backdrop-blur-sm" style="background:rgba(251, 245, 234, 0.96); border-color:#3b1f0d22;">
      <div class="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <button
          v-if="currentStepIndex > 0"
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition-all hover:-translate-y-0.5"
          style="background:white; color:#5b3a1d; border-color:#3b1f0d33; font-family: system-ui, sans-serif;"
          @click="prevStep"
        >
          <ArrowLeft class="w-4 h-4" /> Back
        </button>
        <div v-else class="w-16" />

        <div class="text-xs italic" style="color:#9a5614; font-family:'Playfair Display', serif;">
          Step <strong style="color:#3b1f0d;">{{ currentStepIndex + 1 }}</strong> of {{ steps.length }}
        </div>

        <button
          v-if="currentStep !== 'preview'"
          type="button"
          class="inline-flex items-center gap-2 px-5 py-2 rounded-full text-white text-sm font-bold uppercase tracking-wider"
          style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow: 0 3px 0 -1px #b91c1c; font-family: system-ui, sans-serif;"
          @click="nextStep"
        >
          Next <ArrowRight class="w-4 h-4" />
        </button>
        <button
          v-else
          type="button"
          class="inline-flex items-center gap-2 px-5 py-2 rounded-full text-white text-sm font-bold uppercase tracking-wider disabled:opacity-60"
          :disabled="isPublishing"
          style="background:linear-gradient(135deg, #16a34a, #0891b2); box-shadow: 0 3px 0 -1px #15803d; font-family: system-ui, sans-serif;"
          @click="publish"
        >
          {{ isPublishing ? 'Publishing…' : 'Publish' }}
        </button>
      </div>
    </div>
  </div>
</template>
