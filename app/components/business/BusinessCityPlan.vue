<script setup lang="ts">
/**
 * The city's year plan (RAZ-970): the next 12 months of occasions worth a post — Bavaria's
 * silent days (Tanzverbot), Fasching, Halloween, New Year's Eve, Oktoberfest, open-air season —
 * each a chip coloured by where it stands. A click opens its post (BusinessCityOccasion), or
 * the question to the city's organisers when that comes first.
 *
 *   <BusinessCityPlan city-slug="munich" />
 */
import { Moon, PartyPopper, Sun, Clock } from 'lucide-vue-next'

const props = defineProps<{ citySlug: string }>()
const { $trpc } = useNuxtApp()

type Plan = Awaited<ReturnType<typeof $trpc.cityOccasions.plan.query>>
type Item = Plan['months'][number]['occasions'][number]
const plan = ref<Plan | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  try { plan.value = await $trpc.cityOccasions.plan.query({ citySlug: props.citySlug }) }
  catch (e: any) { error.value = e?.message || 'Couldn’t load the plan.' }
  finally { loading.value = false }
}
onMounted(load)

const KIND = { silent: { label: 'Silent day', icon: Moon }, party: { label: 'Party', icon: PartyPopper }, season: { label: 'Season', icon: Sun } } as const
const STATUS = {
  todo: { label: 'To do', cls: 'bg-muted text-foreground' },
  draft: { label: 'Draft saved', cls: 'bg-sky-100 text-sky-900' },
  asked: { label: 'Organisers asked', cls: 'bg-violet-100 text-violet-900' },
  posted: { label: 'Posted', cls: 'bg-wd-green-600/15 text-wd-green-700' },
} as const

const day = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })
const nextLabel = (i: Item) => {
  if (!i.next) return null
  if (i.next.what === 'post' && 'late' in i.next && i.next.late) return 'Post now'
  return `${i.next.what === 'ask' ? 'Ask organisers' : 'Post'} by ${day(i.next.by)}`
}

// What needs doing in the coming week, so it isn't missed in the grid.
const dueSoon = computed(() => (plan.value?.months ?? []).flatMap(m => m.occasions).filter(i => i.next?.due))

const open = ref<{ key: string; tab: 'post' | 'ask' } | null>(null)
function openItem(i: Item) {
  open.value = { key: i.key, tab: i.next?.what === 'ask' ? 'ask' : 'post' }
}
function onOpenChange(v: boolean) {
  if (!v) { open.value = null; load() }
}
</script>

<template>
  <section>
    <p class="text-sm text-muted-foreground">The next 12 months in this city. Each occasion comes with a post written for you — check it, pick the languages, post. For parties, ask the city’s organisers first what they plan.</p>

    <AdminState v-if="loading" kind="loading" />
    <AdminState v-else-if="error" kind="error" :message="error" />
    <template v-else-if="plan">
      <div v-if="dueSoon.length" class="mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4" data-testid="plan-due">
        <h3 class="flex items-center gap-2 text-eyebrow font-bold uppercase tracking-[0.3em] text-wd-red-800"><Clock class="size-4" aria-hidden="true" /> This week</h3>
        <ul class="mt-2 grid gap-2">
          <li v-for="i in dueSoon" :key="i.key" class="flex flex-wrap items-center gap-2 text-sm">
            <span class="font-bold">{{ nextLabel(i) }}</span>
            <span class="text-muted-foreground">· {{ i.name }}, {{ i.when }}</span>
            <Button type="button" variant="pill" size="pill-sm" class="ml-auto" @click="openItem(i)">{{ i.next?.what === 'ask' ? 'Ask organisers' : 'Open the post' }}</Button>
          </li>
        </ul>
      </div>

      <div class="mt-4 flex flex-wrap gap-2 text-xs">
        <span v-for="(s, k) in STATUS" :key="k" class="rounded-full px-2 py-0.5 font-bold" :class="s.cls">{{ s.label }}</span>
      </div>

      <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="plan-months">
        <div v-for="m in plan.months" :key="m.month" class="min-h-[6.5rem] rounded-xl border border-border bg-card p-2">
          <div class="text-xs font-bold text-muted-foreground">{{ m.label }}</div>
          <div class="mt-1 grid gap-1">
            <button
              v-for="i in m.occasions" :key="i.key" type="button"
              class="flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-bold transition hover:ring-2 hover:ring-primary/30"
              :class="STATUS[i.status].cls"
              :title="`${i.name}${i.localName ? ` (${i.localName})` : ''} · ${i.when} · ${i.note}`"
              @click="openItem(i)"
            >
              <component :is="KIND[i.kind].icon" class="mt-0.5 size-3.5 shrink-0" :aria-label="KIND[i.kind].label" />
              <span class="min-w-0">
                <span class="block truncate">{{ i.name }}</span>
                <span class="block font-normal opacity-75">{{ i.when }}</span>
              </span>
            </button>
            <span v-if="!m.occasions.length" class="text-[11px] text-muted-foreground">Nothing this month.</span>
          </div>
        </div>
      </div>
    </template>

    <Dialog :open="!!open" @update:open="onOpenChange">
      <DialogScrollContent class="sm:max-w-2xl">
        <BusinessCityOccasion v-if="open" :city-slug="citySlug" :occasion-key="open.key" :tab="open.tab" />
      </DialogScrollContent>
    </Dialog>
  </section>
</template>
