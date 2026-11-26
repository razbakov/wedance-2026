<script setup lang="ts">
/**
 * Sketch (RAZ-1010): when to ask someone to tell people they're going.
 *
 * Before booking, Going together is a lift, a room or a dinner — no share link,
 * no popup. After booking, one button opens the story already on My plan.
 * Mock data only: nothing is sent or written. The button is the real
 * TellYourStory component.
 */
import { ArrowRight, Car, Check, Ticket, Users, Utensils } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'

definePageMeta({ layout: false })
useHead({ title: 'WeDance — Tell your story', meta: [{ name: 'robots', content: 'noindex' }] })

type Moment = 'before' | 'week' | 'year' | 'class'
const moment = ref<Moment>('week')
const device = ref<'desktop' | 'mobile'>('desktop')
const isMobile = computed(() => device.value === 'mobile')

const MOMENTS: { id: Moment, label: string }[] = [
  { id: 'before', label: 'Before booking' },
  { id: 'week', label: 'Booked · this week' },
  { id: 'year', label: 'Booked · festival later' },
  { id: 'class', label: 'Booked · a class' },
]
const IDEA: Record<Moment, string> = {
  before: 'Idea · Don’t ask yet. Good · Going together stays a lift, a room or a dinner. Cost · Nobody is invited before they’ve committed.',
  week: 'Idea · Tell your story, this week. Good · One button opens the story already on My plan. Cost · It waits until the spot is booked.',
  year: 'Idea · A later festival is a year, not this week. Good · The year story is where that picture already lives. Cost · The week story would not include it.',
  class: 'Idea · A class is not that story. Good · The week story is nights out, so a class gets no button. Cost · There is no “bring a friend to class” here.',
}

const soon = new Date(Date.now() + 3 * 86400000).toISOString()
const later = new Date(Date.now() + 40 * 86400000).toISOString()
const ready = ref(false)
onMounted(() => { ready.value = true })
</script>

<template>
  <div class="min-h-screen bg-muted/40 text-foreground font-sans" :data-ready="ready ? '1' : undefined">
    <div class="sticky top-0 z-[60] border-b border-border bg-card/95 backdrop-blur">
      <div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
        <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tell your story · sketch</span>
        <div class="flex flex-wrap rounded-full border border-border p-0.5 bg-background text-xs">
          <button
            v-for="m in MOMENTS" :key="m.id" type="button"
            class="rounded-full px-3 py-1 font-bold"
            :class="moment === m.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'"
            @click="moment = m.id"
          >{{ m.label }}</button>
        </div>
        <div class="flex rounded-full border border-border p-0.5 bg-background text-xs">
          <button type="button" class="rounded-full px-3 py-1 font-bold" :class="device === 'desktop' ? 'bg-foreground text-background' : 'text-muted-foreground'" @click="device = 'desktop'">Desktop</button>
          <button type="button" class="rounded-full px-3 py-1 font-bold" :class="device === 'mobile' ? 'bg-foreground text-background' : 'text-muted-foreground'" @click="device = 'mobile'">Mobile</button>
        </div>
      </div>
      <p class="max-w-6xl mx-auto px-4 pb-3 text-sm text-muted-foreground">{{ IDEA[moment] }}</p>
    </div>

    <div class="py-8" :class="isMobile ? 'px-4' : 'px-10'">
      <div
        class="mx-auto bg-background overflow-hidden font-display"
        :class="isMobile ? 'w-[390px] rounded-[2rem] border-[10px] border-foreground shadow-xl' : 'max-w-3xl rounded-2xl border border-border shadow-sm'"
      >
        <div class="px-5 py-6" :class="isMobile ? '' : 'px-10 py-8'">
          <p class="font-hand text-secondary">— Friday · 21:00</p>
          <h1 class="font-black leading-none" :class="isMobile ? 'text-4xl' : 'text-5xl'">Casino Partnerwork</h1>
          <p class="mt-2 text-sm font-sans text-muted-foreground">Hamza, Yunior · salsa</p>

          <div v-if="moment === 'before'" class="mt-5 flex flex-wrap gap-2">
            <Button variant="cta" class="px-6"><Ticket aria-hidden="true" /> Book my spot</Button>
            <Button variant="outline-pill" class="px-5">My plan</Button>
          </div>

          <div v-else class="mt-5 max-w-xl rounded-2xl border border-success/30 bg-success/10 px-4 py-3 space-y-1 font-sans" role="status">
            <p class="inline-flex items-center gap-1.5 font-bold text-wd-green-700"><Check class="size-4" aria-hidden="true" /> Spot booked</p>
            <p class="text-xs text-muted-foreground">The organiser has your name and email. <span class="font-bold text-wd-green-700">On My plan</span></p>
            <TellYourStory
              v-if="moment === 'week'"
              signed-in type="party" :start-date="soon" timezone="Europe/Berlin" surface="sketch"
            />
            <TellYourStory
              v-else-if="moment === 'year'"
              signed-in type="congress" :start-date="later" timezone="Europe/Berlin" surface="sketch"
            />
            <TellYourStory
              v-else
              signed-in type="class" :start-date="soon" timezone="Europe/Berlin" surface="sketch"
            />
            <p v-if="moment === 'class'" class="text-xs text-muted-foreground">No story button — a class is not a night out.</p>
          </div>

          <div v-if="moment === 'week'" class="mt-3 max-w-xl rounded-2xl border border-border bg-card px-4 py-3 font-sans">
            <p class="inline-flex items-center gap-1.5 font-bold"><Users class="size-4" aria-hidden="true" /> Meet who’s going</p>
            <p class="mt-1 text-sm text-muted-foreground">Dancers going out near you can see you’re going.</p>
            <Button variant="cta" size="pill-sm" class="mt-2">Meet who’s going <ArrowRight aria-hidden="true" /></Button>
          </div>

          <section class="mt-10">
            <h2 class="mb-1 text-2xl font-black">Going together</h2>
            <p class="text-sm font-sans text-muted-foreground">Nobody has posted yet. Offer a lift, a bed or a dinner and others can join you.</p>
            <div class="mt-3 flex flex-wrap gap-2 font-sans">
              <span class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-bold"><Car class="size-4 text-sky-600" aria-hidden="true" /> Need a lift?</span>
              <span class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-bold">Split a room</span>
              <span class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-bold"><Utensils class="size-4 text-amber-600" aria-hidden="true" /> Don’t eat alone</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
