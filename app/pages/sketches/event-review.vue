<script setup lang="ts">
/**
 * Sketch (RAZ-1011): reviews on an event page.
 *
 * Where the rating shows (A: under the picture · B: a row in the facts, after the venue ·
 * Today: a chip in the meta row + the section at the bottom), what a dancer sees before and
 * after the night (only people who went are asked, the morning after, by email and on the
 * page), and a tip asked right after a good review.
 *
 * Mock data only: nothing is sent or written.
 */
import { CalendarDays, Check, Heart, Mail, MapPin, Star, Ticket, Users } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'

definePageMeta({ layout: false })
useHead({ title: 'WeDance — Event review sketch', meta: [{ name: 'robots', content: 'noindex' }] })

type Moment = 'before' | 'went' | 'missed' | 'reviewed'
const moment = ref<Moment>('went')
const hasReviews = ref(true)
const device = ref<'desktop' | 'mobile'>('desktop')

// The page's tabs: the stars under the picture open Reviews.
const tab = ref<'overview' | 'reviews'>('overview')
function openReviews() {
  tab.value = 'reviews'
  nextTick(() => document.getElementById('event-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}
const MOMENTS: { id: Moment, label: string }[] = [
  { id: 'before', label: 'Before the night' },
  { id: 'went', label: 'After · I went' },
  { id: 'missed', label: 'After · didn’t go' },
  { id: 'reviewed', label: 'After · reviewed' },
]

// A weekly party: the rating is the series' (earlier Thursdays), so a new date isn't "no reviews".
const REVIEWS = [
  { name: 'Marta', rating: 5, when: 'Thu, 12 Nov', text: 'The band at 22:00 was unreal. Floor full until midnight, great leaders.' },
  { name: 'Jonas', rating: 5, when: 'Thu, 5 Nov', text: 'Best timba in Munich. The class before is a good warm-up.' },
  { name: 'Sofía', rating: 4, when: 'Thu, 29 Oct', text: 'Loved it — a bit too crowded after 23:00.' },
]
const avg = computed(() => hasReviews.value ? 4.7 : 0)
const count = computed(() => hasReviews.value ? 23 : 0)

// The "How was it?" card (after the night, for people who went).
const myRating = ref(0)
const hover = ref(0)
const myText = ref('')
const posted = ref(false)
const tip = ref<number | null>(5)
const tipped = ref(false)
watch(moment, (m) => {
  posted.value = m === 'reviewed'
  myRating.value = m === 'reviewed' ? 5 : 0
  myText.value = m === 'reviewed' ? 'Such a good night, the band!' : ''
  tipped.value = false
}, { immediate: true })
const after = computed(() => moment.value !== 'before')
const ratingWord = (n: number) => ['', 'Not for me', 'Meh', 'Good', 'Great', 'Loved it'][n]

function post() { if (myRating.value) posted.value = true }
</script>

<template>
  <div class="min-h-screen bg-muted/40 text-foreground font-sans">
    <!-- Sketch controls (not part of the prototype) -->
    <div class="sticky top-0 z-[60] border-b border-border bg-card/95 backdrop-blur">
      <div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
        <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">Event review · sketch</span>
        <div class="flex flex-wrap rounded-full border border-border p-0.5 bg-background text-xs">
          <button v-for="m in MOMENTS" :key="m.id" type="button" class="px-3 h-7 rounded-full font-semibold"
            :class="moment === m.id ? 'bg-foreground text-background' : 'text-muted-foreground'" @click="moment = m.id">{{ m.label }}</button>
        </div>
        <div class="flex rounded-full border border-border p-0.5 bg-background text-xs">
          <button v-for="b in [true, false]" :key="String(b)" type="button" class="px-3 h-7 rounded-full font-semibold"
            :class="hasReviews === b ? 'bg-foreground text-background' : 'text-muted-foreground'" @click="hasReviews = b">{{ b ? '23 reviews' : 'None yet' }}</button>
        </div>
        <div class="flex rounded-full border border-border p-0.5 bg-background text-xs">
          <button v-for="d in (['desktop', 'mobile'] as const)" :key="d" type="button" class="px-3 h-7 rounded-full font-semibold capitalize"
            :class="device === d ? 'bg-foreground text-background' : 'text-muted-foreground'" @click="device = d">{{ d }}</button>
        </div>
        <span class="text-xs text-muted-foreground ml-auto">Mock data — nothing is saved.</span>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 py-8 grid gap-8" :class="device === 'desktop' ? 'lg:grid-cols-[1.6fr_1fr]' : 'lg:grid-cols-[auto_1fr]'">
      <!-- ── The event page ─────────────────────────────── -->
      <section class="mx-auto w-full" :class="device === 'mobile' ? 'max-w-[390px]' : ''">
        <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Dancer · event page</p>
        <div class="rounded-3xl bg-background border border-border shadow-sm overflow-hidden">
          <!-- Hero -->
          <div class="p-5 sm:p-6 grid gap-5" :class="device === 'desktop' ? 'sm:grid-cols-[13rem_1fr] sm:items-start' : ''">
            <div>
              <div class="rounded-2xl border border-border overflow-hidden bg-gradient-to-br from-wd-red-600 via-wd-amber-500 to-wd-brown-900 flex items-end p-3"
                :class="device === 'desktop' ? 'aspect-[4/5]' : 'h-36'">
                <span class="font-display text-white text-xl leading-tight drop-shadow">Timba Thursday<br><span class="text-sm italic">live band · DJ Hamza</span></span>
              </div>
              <!-- A: the rating under the picture -->
              <a href="#reviews" class="mt-2 flex items-center gap-1.5 rounded-xl px-2 py-1.5 hover:bg-muted/60" data-variant="A" @click.prevent="openReviews">
                <template v-if="count">
                  <span class="flex">
                    <Star v-for="n in 5" :key="n" class="size-4" :class="n <= Math.round(avg) ? 'text-wd-amber-500 fill-wd-amber-500' : 'text-border'" />
                  </span>
                  <b>{{ avg.toFixed(1) }}</b>
                  <span class="text-xs text-muted-foreground underline underline-offset-2">{{ count }} reviews</span>
                </template>
                <span v-else class="text-xs text-muted-foreground">No reviews yet</span>
              </a>
            </div>

            <div class="min-w-0">
              <p class="mb-2 text-sm text-muted-foreground"><b class="text-foreground">La Timberia</b> presents</p>
              <h1 class="font-display text-3xl sm:text-4xl leading-tight">Timba Thursday — Live Band &amp; Party</h1>
              <dl class="mt-3 space-y-2 text-sm sm:text-base">
                <div class="flex items-start gap-2.5">
                  <CalendarDays class="mt-0.5 size-4 shrink-0 text-secondary" />
                  <dd class="flex flex-wrap items-center gap-2">
                    <b>Thu, 19 Nov · 20:00–00:00</b>
                    <span class="rounded-full px-2 py-0.5 text-xs font-bold bg-primary/10 text-primary">{{ after ? 'Was last Thursday' : 'In 3 days' }}</span>
                  </dd>
                </div>
                <div class="flex items-start gap-2.5">
                  <MapPin class="mt-0.5 size-4 shrink-0 text-secondary" />
                  <dd><b class="block">La Timberia</b><span class="text-sm text-muted-foreground">Neuhauser Str. 47, München</span></dd>
                </div>
              </dl>

              <p class="mt-3 text-sm sm:text-base leading-relaxed">Cuban timba every Thursday: a beginner class at 19:00, the party at 20:00, live band at 22:00.</p>

              <!-- The main action changes with the moment -->
              <div class="mt-5">
                <Button v-if="moment === 'before'" variant="cta" class="px-6"><Ticket /> Book my spot · €15</Button>

                <!-- After, you went: "How was it?" takes the button's place -->
                <div v-else-if="moment === 'went' || moment === 'reviewed'" class="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4" data-how-was-it>
                  <template v-if="!posted">
                    <p class="font-bold">You were here on Thursday. How was it?</p>
                    <div class="mt-2 flex items-center gap-1" @mouseleave="hover = 0">
                      <button v-for="n in 5" :key="n" type="button" :aria-label="`${n} stars`" @mouseenter="hover = n" @click="myRating = n">
                        <Star class="size-8 transition-transform hover:scale-110" :class="n <= (hover || myRating) ? 'text-wd-amber-500 fill-wd-amber-500' : 'text-border'" />
                      </button>
                      <span class="ml-2 text-sm font-bold text-secondary">{{ ratingWord(hover || myRating) }}</span>
                    </div>
                    <template v-if="myRating">
                      <textarea v-model="myText" rows="2" placeholder="What made the night? (optional)" class="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm" />
                      <Button variant="pill" size="pill-sm" class="mt-2" @click="post">Post review</Button>
                    </template>
                  </template>

                  <!-- Posted: thanks + the tip ask (only after 4–5 stars) -->
                  <template v-else>
                    <p class="flex items-center gap-2 font-bold text-wd-green-700"><Check class="size-4" /> Thanks — your {{ myRating }}★ review is up. <button type="button" class="ml-auto text-sm font-bold text-primary hover:underline" @click="openReviews">See it</button></p>
                    <div v-if="myRating >= 4 && !tipped" class="mt-3 border-t border-primary/20 pt-3" data-tip>
                      <p class="font-bold flex items-center gap-1.5"><Heart class="size-4 text-primary fill-primary" /> Glad you loved it. Say thanks to La Timberia?</p>
                      <p class="text-sm text-muted-foreground">A tip goes to the organisers and the band. WeDance keeps nothing.</p>
                      <div class="mt-2 flex flex-wrap gap-2">
                        <button v-for="a in [3, 5, 10]" :key="a" type="button" class="rounded-full border-2 px-4 py-1.5 text-sm font-bold"
                          :class="tip === a ? 'border-primary bg-primary text-primary-foreground' : 'border-border'" @click="tip = a">€{{ a }}</button>
                        <button type="button" class="rounded-full border-2 border-border px-4 py-1.5 text-sm font-bold" :class="tip === 0 ? 'border-primary' : ''" @click="tip = 0">Other</button>
                      </div>
                      <div class="mt-3 flex flex-wrap items-center gap-3">
                        <Button variant="cta" size="pill-sm" @click="tipped = true">Tip €{{ tip || '…' }}</Button>
                        <button type="button" class="text-sm text-muted-foreground hover:underline" @click="tipped = true">Not now</button>
                      </div>
                      <p class="mt-2 text-xs text-muted-foreground">or <a href="#" class="underline">support WeDance</a> — we're free for dancers.</p>
                    </div>
                    <p v-else-if="tipped" class="mt-2 text-sm text-muted-foreground">Next Thursday is on WeDance too — <a href="#" class="font-bold text-primary hover:underline">Book Thu, 26 Nov →</a></p>
                  </template>
                </div>

                <!-- After, didn't go: the next date, no review ask -->
                <div v-else class="flex flex-wrap items-center gap-3">
                  <Button variant="cta" class="px-6"><Ticket /> Next one · Thu, 26 Nov</Button>
                  <span class="text-xs text-muted-foreground">Only people who went can review.</span>
                </div>
              </div>
            </div>
          </div>

          <!-- The page's tabs (as festivals have Overview / Line-up / Schedule / Passes) -->
          <div id="event-tabs" class="sticky top-[57px] z-10 flex gap-1 border-y border-border bg-background px-3 scroll-mt-16" role="tablist">
            <button v-for="t in (['overview', 'reviews'] as const)" :key="t" type="button" role="tab" :aria-selected="tab === t"
              class="px-3 py-3 text-sm font-bold border-b-2 -mb-px capitalize"
              :class="tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'"
              @click="tab = t">
              {{ t }}<span v-if="t === 'reviews' && count" class="ml-1 inline-flex items-center gap-0.5 font-normal text-muted-foreground"><Star class="size-3 text-wd-amber-500 fill-wd-amber-500" />{{ avg.toFixed(1) }} · {{ count }}</span>
            </button>
          </div>

          <!-- Overview: what's on the page today -->
          <div v-show="tab === 'overview'" class="p-5 sm:p-6 space-y-5 text-sm">
            <div>
              <h3 class="text-2xl font-display">The night</h3>
              <ul class="mt-3 space-y-2">
                <li class="flex gap-3"><b class="w-12 tabular-nums">19:00</b> Beginner timba class · Yunior</li>
                <li class="flex gap-3"><b class="w-12 tabular-nums">20:00</b> Party · DJ Hamza</li>
                <li class="flex gap-3"><b class="w-12 tabular-nums">22:00</b> Live band</li>
              </ul>
            </div>
            <div>
              <h3 class="text-2xl font-display">Entry</h3>
              <p class="mt-2">€15 class + party · €8 party only</p>
            </div>
            <div>
              <h3 class="text-2xl font-display">Run by</h3>
              <p class="mt-2"><b>La Timberia</b></p>
            </div>
          </div>

          <!-- Reviews: its own tab, opened from the stars under the picture -->
          <div v-show="tab === 'reviews'" id="reviews" class="p-5 sm:p-6">
            <div class="flex items-center justify-between">
              <h3 class="text-2xl font-display">Reviews</h3>
              <span v-if="count" class="flex items-center gap-1.5"><Star class="size-4 text-wd-amber-500 fill-wd-amber-500" /><b>{{ avg.toFixed(1) }}</b><span class="text-xs text-secondary">· {{ count }} reviews</span></span>
            </div>
            <!-- Who can review, said where the reader looks -->
            <p class="mt-3 text-sm text-muted-foreground">
              <template v-if="moment === 'before'">Going? You can review it the day after — we'll send you a link.</template>
              <template v-else-if="moment === 'missed'">Reviews are from people who booked a night here.</template>
              <template v-else-if="moment === 'went' && !posted">Your review goes at the top. <a href="#" class="font-bold text-primary">Rate Thursday ↑</a></template>
            </p>
            <ul v-if="count" class="mt-4 space-y-3">
              <li v-if="posted" class="rounded-2xl border-2 border-primary/30 bg-card p-4">
                <div class="flex justify-between"><b class="text-sm">You · <span class="font-normal text-muted-foreground">Thu, 19 Nov · went</span></b><span class="flex"><Star v-for="n in 5" :key="n" class="size-3.5 text-wd-amber-500 fill-wd-amber-500" /></span></div>
                <p class="mt-2 text-sm text-muted-foreground">{{ myText || ratingWord(myRating) }}</p>
              </li>
              <li v-for="r in REVIEWS" :key="r.name" class="rounded-2xl border border-border bg-card p-4">
                <div class="flex justify-between">
                  <b class="text-sm">{{ r.name }} · <span class="font-normal text-muted-foreground">{{ r.when }} · went</span></b>
                  <span class="flex"><Star v-for="n in 5" :key="n" class="size-3.5" :class="n <= r.rating ? 'text-wd-amber-500 fill-wd-amber-500' : 'text-border'" /></span>
                </div>
                <p class="mt-2 text-sm text-muted-foreground">{{ r.text }}</p>
              </li>
            </ul>
            <p v-else class="mt-3 text-sm italic text-secondary">No reviews yet.</p>
          </div>
        </div>
      </section>

      <!-- ── The email, the morning after ─────────────────── -->
      <aside class="space-y-3">
        <p class="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email · Friday 11:00, to everyone who booked</p>
        <div class="rounded-2xl bg-background border border-border p-5 shadow-sm max-w-[420px]">
          <p class="text-xs text-muted-foreground flex items-center gap-1.5"><Mail class="size-3.5" /> La Timberia via WeDance</p>
          <p class="mt-1 font-bold">How was Thursday at La Timberia?</p>
          <hr class="my-3 border-border">
          <p class="text-sm">Hi Alex, you booked Timba Thursday last night. One tap tells La Timberia how it went:</p>
          <div class="mt-3 flex gap-1">
            <a v-for="n in 5" :key="n" href="#" class="rounded-lg border border-border px-2 py-1.5 hover:bg-muted" @click.prevent="moment = 'went'; myRating = n">
              <Star class="size-6 text-wd-amber-500" :class="n <= 5 ? 'fill-wd-amber-500/20' : ''" />
              <span class="block text-center text-[10px] font-bold">{{ n }}</span>
            </a>
          </div>
          <p class="mt-3 text-xs text-muted-foreground">Each star opens the event page with that rating picked — add a line if you like. Didn't make it? <a href="#" class="underline">Tell us</a> and we won't ask again.</p>
        </div>

        <div class="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground max-w-[420px] space-y-2">
          <p class="font-bold text-foreground">Rules in this sketch</p>
          <p>· Only people who <b>booked</b> (or checked in) can review, and only <b>after the night ends</b>. Each review says “went”.</p>
          <p>· A weekly party's rating is the <b>series'</b> — a new Thursday shows the earlier nights' 4.7, not “no reviews”.</p>
          <p>· The tip ask comes <b>only after 4–5★</b>, once per night, and goes to the organiser (Stripe). “Support WeDance” is a quiet link, not a second ask.</p>
          <p>· People who didn't go are never asked; “Tell us” in the email stops the reminder.</p>
        </div>
      </aside>
    </div>
  </div>
</template>
