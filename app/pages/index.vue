<script setup lang="ts">
import {
  ArrowRight,
  CalendarPlus,
  Check,
  Circle,
  Heart,
  Users,
  ChevronDown,
  Car,
  UtensilsCrossed,
  Sparkles,
  Video,
  Handshake,
  PartyPopper,
} from 'lucide-vue-next'

useHead({
  title: 'WeDance — Meet Dancers at Festivals',
  meta: [
    { name: 'description', content: 'Swipe to connect with dancers, join group dinners, share rides, and discover activities around your next dance festival.' },
  ],
})

const router = useRouter()

// Intersection Observer for scroll-triggered animations
function useScrollReveal() {
  const refs = new Map<string, Ref<boolean>>()

  function createSection(id: string) {
    const visible = ref(false)
    refs.set(id, visible)
    return visible
  }

  onMounted(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.section
            if (id && refs.has(id)) {
              refs.get(id)!.value = true
            }
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.3 },
    )

    document.querySelectorAll('[data-section]').forEach((el) => {
      observer.observe(el)
    })
  })

  return { createSection }
}

const { createSection } = useScrollReveal()

const swipeVisible = createSection('swipe')
const checklistVisible = createSection('checklist')
const featuresVisible = createSection('features')
const friendsVisible = createSection('friends')

// Checklist animation: items check themselves sequentially
const checklistItems = ref([
  { label: 'Save the dates', extra: 'Mar 26–29', checked: false },
  { label: 'Get tickets', extra: '', checked: false },
  { label: 'Share a ride', extra: '', checked: false },
  { label: 'Share a meal', extra: '', checked: false },
  { label: 'Extra activities', extra: '', checked: false },
])

let checkInterval: ReturnType<typeof setInterval> | null = null

watch(checklistVisible, (visible) => {
  if (!visible) return
  let i = 0
  checkInterval = setInterval(() => {
    if (i < checklistItems.value.length) {
      checklistItems.value[i].checked = true
      i++
    }
    else {
      clearInterval(checkInterval!)
    }
  }, 600)
})

// Friends: appear one by one
const friendsList = ref([
  { initials: 'A', name: 'Anna K.', city: 'Berlin', bgClass: 'bg-pink-100', textClass: 'text-pink-600', visible: false },
  { initials: 'M', name: 'Marco R.', city: 'Munich', bgClass: 'bg-blue-100', textClass: 'text-blue-600', visible: false },
  { initials: 'S', name: 'Sofia M.', city: 'Vienna', bgClass: 'bg-green-100', textClass: 'text-green-600', visible: false },
])

const friendsCountVisible = ref(false)

watch(friendsVisible, (visible) => {
  if (!visible) return
  friendsList.value.forEach((f, i) => {
    setTimeout(() => { f.visible = true }, (i + 1) * 400)
  })
  setTimeout(() => { friendsCountVisible.value = true }, 1800)
})

// Feature grid items
const features = [
  { icon: Handshake, title: 'Meet dancers', description: 'Swipe to match with people at your festival' },
  { icon: Car, title: 'Share a ride', description: 'Find or offer rides, split costs' },
  { icon: UtensilsCrossed, title: 'Group dinners', description: 'Curated meals with fellow dancers' },
  { icon: Sparkles, title: 'Taxi dancers', description: 'Book a pro partner for any workshop' },
  { icon: Video, title: 'Videographer', description: 'Capture your best moves on the floor' },
  { icon: PartyPopper, title: 'Extra activities', description: 'City tours, flashmobs, beach socials' },
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative border-b">
      <div class="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
      <div class="relative max-w-2xl mx-auto px-4 pt-20 pb-16 text-center">
        <p class="text-sm text-muted-foreground mb-6">For dancers who go to festivals</p>
        <h1 class="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
          Don't just attend.<br />
          <em class="not-italic text-primary">Connect.</em>
        </h1>
        <p class="mt-4 text-muted-foreground text-base sm:text-lg max-w-md mx-auto">
          Meet dancers. Join group dinners. Find ride shares.<br />
          Book a taxi dancer. All around your next festival.
        </p>
        <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" class="gap-2" @click="router.push('/festivals')">
            Browse festivals <ArrowRight class="w-4 h-4" />
          </Button>
          <span class="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full">
            Free for the first 10 dancers per festival
          </span>
        </div>
        <div class="mt-12 animate-bounce text-muted-foreground/40">
          <ChevronDown class="w-5 h-5 mx-auto" />
        </div>
      </div>
    </section>

    <!-- Shall we dance: Swipe Card -->
    <section class="border-b" data-section="swipe">
      <div class="max-w-2xl mx-auto px-4 py-16 sm:py-20">
        <p class="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Meet people</p>
        <h2 class="text-2xl sm:text-3xl font-bold tracking-tight">
          Swipe right to connect.
        </h2>
        <p class="mt-2 text-muted-foreground text-sm max-w-md">
          Find dancers, group dinners, and activities — all in one feed.
        </p>

        <!-- Mock cards: dancer, dinner, activity -->
        <Transition
          enter-active-class="transition duration-500 ease-out"
          enter-from-class="opacity-0 translate-y-4"
          enter-to-class="opacity-100 translate-y-0"
        >
          <div v-if="swipeVisible" class="mt-10 flex flex-row gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0 sm:gap-6">
            <!-- Dancer card -->
            <div class="w-[200px] sm:w-[220px] shrink-0 snap-start">
              <div class="rounded-xl border-2 border-border overflow-hidden bg-background shadow-lg transform sm:rotate-[-2deg]">
                <div class="relative aspect-[3/4] bg-muted">
                  <img
                    src="https://i.pravatar.cc/400?u=isabella"
                    alt="Isabella Ruiz"
                    class="w-full h-full object-cover"
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div class="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <div class="flex items-center gap-1.5">
                      <h4 class="text-sm font-semibold">Isabella Ruiz</h4>
                      <span class="bg-white/20 text-white border border-white/30 text-[10px] px-1.5 py-0 rounded-full">Follow</span>
                    </div>
                    <p class="text-[11px] text-white/80 mt-0.5">Love social dancing! 3rd festival.</p>
                    <div class="flex gap-1 mt-1.5">
                      <span class="bg-white/20 text-white border border-white/30 text-[10px] px-1.5 py-0.5 rounded-full">Salsa</span>
                      <span class="bg-white/20 text-white border border-white/30 text-[10px] px-1.5 py-0.5 rounded-full">Bachata</span>
                    </div>
                  </div>
                </div>
              </div>
              <p class="text-center text-[11px] text-muted-foreground mt-2">Swipe right to connect</p>
            </div>

            <!-- Dinner card -->
            <div class="w-[200px] sm:w-[220px] shrink-0 snap-start">
              <div class="rounded-xl border-2 border-border overflow-hidden bg-background shadow-lg transform sm:rotate-[1deg]">
                <div class="aspect-[3/4] bg-gradient-to-br from-orange-50 to-amber-100 flex flex-col items-center justify-center p-5 text-center space-y-3">
                  <div class="w-12 h-12 rounded-full bg-orange-100 border-2 border-orange-200 flex items-center justify-center">
                    <UtensilsCrossed class="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <h4 class="text-sm font-semibold">Friday dinner</h4>
                    <p class="text-[11px] text-muted-foreground">19:00 · La Piazza</p>
                  </div>
                  <div class="w-full max-w-[140px] space-y-1">
                    <div class="flex items-center justify-between text-[11px]">
                      <span class="text-muted-foreground">Spots</span>
                      <span class="font-medium text-orange-600">4/6</span>
                    </div>
                    <div class="w-full bg-orange-200/50 rounded-full h-1.5">
                      <div class="bg-orange-400 rounded-full h-1.5 w-2/3" />
                    </div>
                  </div>
                  <span class="bg-orange-500 text-white text-[10px] font-medium px-2.5 py-1 rounded-full">Swipe right to join</span>
                </div>
              </div>
              <p class="text-center text-[11px] text-muted-foreground mt-2">Meet new friends over dinner</p>
            </div>

            <!-- Activity card -->
            <div class="w-[200px] sm:w-[220px] shrink-0 snap-start">
              <div class="rounded-xl border-2 border-border overflow-hidden bg-background shadow-lg transform sm:rotate-[3deg]">
                <div class="aspect-[3/4] bg-gradient-to-br from-emerald-50 to-teal-100 flex flex-col items-center justify-center p-5 text-center space-y-3">
                  <div class="w-12 h-12 rounded-full bg-emerald-100 border-2 border-emerald-200 flex items-center justify-center">
                    <PartyPopper class="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h4 class="text-sm font-semibold">Beach social dance</h4>
                    <p class="text-[11px] text-muted-foreground">Saturday · 16:00</p>
                  </div>
                  <p class="text-[11px] text-muted-foreground max-w-[160px]">Open-air dancing at the beach — bring your shoes!</p>
                  <span class="text-[11px] font-medium text-emerald-600">12 joined</span>
                  <span class="bg-emerald-500 text-white text-[10px] font-medium px-2.5 py-1 rounded-full">Swipe right to join</span>
                </div>
              </div>
              <p class="text-center text-[11px] text-muted-foreground mt-2">Explore beyond workshops</p>
            </div>
          </div>
        </Transition>
      </div>
    </section>

    <!-- Checklist -->
    <section class="border-b bg-muted/20" data-section="checklist">
      <div class="max-w-2xl mx-auto px-4 py-16 sm:py-20">
        <p class="text-sm font-medium text-primary uppercase tracking-wider mb-4">Your plan</p>
        <h2 class="text-2xl sm:text-3xl font-bold tracking-tight">
          One checklist.<br />
          <span class="text-muted-foreground">Nothing falls through the cracks.</span>
        </h2>

        <!-- Mock: checklist items check themselves -->
        <div class="mt-10 max-w-xs">
          <div class="rounded-lg border bg-background shadow-sm overflow-hidden">
            <div class="px-4 py-3 bg-foreground text-background text-sm font-semibold">
              My Plan
            </div>
            <div class="divide-y">
              <div
                v-for="(item, i) in checklistItems"
                :key="i"
                class="px-4 py-2.5 flex items-center gap-3 transition-all duration-500"
                :class="item.checked ? 'bg-primary/5' : ''"
              >
                <!-- Animated checkbox -->
                <Transition
                  enter-active-class="transition duration-300 ease-out"
                  enter-from-class="scale-0"
                  enter-to-class="scale-100"
                  mode="out-in"
                >
                  <div
                    v-if="item.checked"
                    :key="'checked'"
                    class="w-5 h-5 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center"
                  >
                    <Check class="w-3 h-3 text-primary" />
                  </div>
                  <Circle
                    v-else
                    :key="'unchecked'"
                    class="w-5 h-5 text-muted-foreground/30 shrink-0"
                  />
                </Transition>
                <span
                  class="text-sm transition-colors duration-300"
                  :class="item.checked ? 'font-medium text-foreground' : 'text-muted-foreground'"
                >{{ item.label }}</span>
                <span v-if="item.extra" class="ml-auto text-xs text-muted-foreground">{{ item.extra }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Feature Grid -->
    <section class="border-b" data-section="features">
      <div class="max-w-2xl mx-auto px-4 py-16 sm:py-20">
        <p class="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">What's included</p>
        <h2 class="text-2xl sm:text-3xl font-bold tracking-tight">
          More than workshops and parties.
        </h2>

        <div class="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Transition
            v-for="(feature, i) in features"
            :key="feature.title"
            enter-active-class="transition duration-500 ease-out"
            enter-from-class="opacity-0 translate-y-4"
            enter-to-class="opacity-100 translate-y-0"
          >
            <div
              v-if="featuresVisible"
              class="rounded-lg border bg-background p-4 space-y-2"
              :style="{ transitionDelay: `${i * 100}ms` }"
            >
              <component :is="feature.icon" class="w-5 h-5 text-primary" />
              <h3 class="text-sm font-semibold">{{ feature.title }}</h3>
              <p class="text-xs text-muted-foreground leading-relaxed">{{ feature.description }}</p>
            </div>
          </Transition>
        </div>
      </div>
    </section>

    <!-- Friends -->
    <section class="border-b bg-muted/20" data-section="friends">
      <div class="max-w-2xl mx-auto px-4 py-16 sm:py-20">
        <p class="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Stop guessing</p>
        <h2 class="text-2xl sm:text-3xl font-bold tracking-tight">
          Know who's going.<br />
          <span class="text-muted-foreground">Before you book.</span>
        </h2>

        <!-- Mock: friends appear one by one -->
        <div class="mt-10 max-w-sm">
          <div class="rounded-lg border bg-background p-4 shadow-sm">
            <div class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Going to Meneate Viena</div>
            <div class="space-y-3">
              <template v-for="(friend, i) in friendsList" :key="i">
                <Transition
                  enter-active-class="transition duration-400 ease-out"
                  enter-from-class="opacity-0 translate-y-2"
                  enter-to-class="opacity-100 translate-y-0"
                >
                  <div v-if="friend.visible" class="flex items-center gap-3">
                    <div
                      class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      :class="[friend.bgClass, friend.textClass]"
                    >{{ friend.initials }}</div>
                    <div class="flex-1">
                      <div class="text-sm font-medium">{{ friend.name }}</div>
                      <div class="text-xs text-muted-foreground">{{ friend.city }}</div>
                    </div>
                    <span class="text-xs text-primary font-medium flex items-center gap-1">
                      <Heart class="w-3 h-3" /> Friend
                    </span>
                  </div>
                </Transition>
              </template>
            </div>
            <Transition
              enter-active-class="transition duration-400 ease-out"
              enter-from-class="opacity-0"
              enter-to-class="opacity-100"
            >
              <div v-if="friendsCountVisible" class="mt-3 pt-3 border-t flex items-center gap-1 text-xs text-muted-foreground">
                <Users class="w-3.5 h-3.5" />
                <span>+ 197 other dancers</span>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="bg-foreground text-background">
      <div class="max-w-2xl mx-auto px-4 py-16 sm:py-20 text-center">
        <h2 class="text-2xl sm:text-3xl font-bold tracking-tight">
          Your festival starts<br />
          before the first workshop.
        </h2>
        <p class="mt-3 text-background/60 text-base max-w-md mx-auto">
          Stop being a stranger.<br />
          Start connecting with dancers before you arrive.
        </p>
        <div class="mt-8">
          <Button size="lg" variant="secondary" class="gap-2" @click="router.push('/festivals')">
            Find your festival <ArrowRight class="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>

    <!-- Organizer CTA -->
    <section class="max-w-2xl mx-auto px-4 py-12">
      <div class="flex items-center justify-between rounded-lg border p-4 bg-background">
        <div>
          <h3 class="text-sm font-semibold">Organize a dance festival?</h3>
          <p class="text-xs text-muted-foreground mt-0.5">List your event for free and reach thousands of dancers.</p>
        </div>
        <Button variant="outline" size="sm" class="gap-1 shrink-0" @click="router.push('/organizers')">
          Learn more <ArrowRight class="w-3.5 h-3.5" />
        </Button>
      </div>
    </section>
  </div>
</template>
