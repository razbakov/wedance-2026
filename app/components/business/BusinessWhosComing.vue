<script setup lang="ts">
/**
 * "Who's coming" on the organiser's event page: the poll's counts (RAZ-718)
 * and, under them, the people behind the numbers — poll answers, Going! and
 * ticket holders (`rsvp.people`). A chip filters the list to its answer; on a
 * partner event the leaders and followers who could pair up are named.
 * Names only: to email or call someone, "See their contacts" opens the host
 * page's Contacts filtered to this event — the people who shared their contact.
 */
import { rsvpOptions, type RsvpAnswer } from '#shared/utils/rsvp'
import { signupDisplayName, type SignupPerson } from '#shared/utils/rsvpPeople'
import { initialsOf } from '#shared/utils/initials'

const props = defineProps<{ eventId: string, contactsPage?: string | null }>()

const { $trpc } = useNuxtApp()

const poll = ref<Awaited<ReturnType<typeof $trpc.rsvp.summary.query>> | null>(null)
const people = ref<SignupPerson[]>([])
// RAZ-1007: a night's programme — how many come to what, and when they arrive.
const night = ref<Awaited<ReturnType<typeof $trpc.rsvp.night.query>>>(null)
onMounted(async () => {
  const [s, p, n] = await Promise.allSettled([
    $trpc.rsvp.summary.query({ eventId: props.eventId }),
    $trpc.rsvp.people.query({ eventId: props.eventId }),
    $trpc.rsvp.night.query({ eventId: props.eventId }),
  ])
  if (s.status === 'fulfilled') poll.value = s.value
  if (p.status === 'fulfilled') people.value = p.value as SignupPerson[]
  if (n.status === 'fulfilled') night.value = n.value
})
const maxArrival = computed(() => Math.max(1, ...(night.value?.arrivals ?? []).map(a => a.people)))

type Filter = RsvpAnswer | 'plan' | null
const filter = ref<Filter>(null)
// The chip's answer carries over to Contacts' "how they're coming" filter.
const contactsTo = computed(() => {
  if (!props.contactsPage) return null
  const as = filter.value && filter.value !== 'plan' && filter.value !== 'next' ? `&as=${filter.value}` : ''
  return `/business/network/${props.contactsPage}/contacts?event=${props.eventId}${as}`
})

const options = computed(() => poll.value ? rsvpOptions(poll.value.partner) : [])
const labelOf = computed(() => Object.fromEntries(options.value.map(o => [o.id, o.label])) as Record<string, string>)
const planOnly = computed(() => people.value.filter(p => !p.answer))
const chips = computed(() => {
  if (!poll.value) return []
  const list: { id: Filter; label: string; count: number }[] = options.value.map(o => ({ id: o.id, label: o.label, count: poll.value!.counts[o.id] }))
  if (planOnly.value.length) list.push({ id: 'plan', label: 'Going, no answer', count: planOnly.value.length })
  return list
})
const shown = computed(() => filter.value === null
  ? people.value
  : filter.value === 'plan' ? planOnly.value : people.value.filter(p => p.answer === filter.value))

function toggle(id: Filter) { filter.value = filter.value === id ? null : id }

// Followers who need a leader next to leaders who need a follower, signed-in ones only.
const pairs = computed(() => {
  if (!poll.value?.partner) return []
  const f = people.value.filter(p => p.answer === 'needLeader' && p.dancerId)
  const l = people.value.filter(p => p.answer === 'needFollower' && p.dancerId)
  return f.slice(0, l.length).map((p, i) => [p, l[i]!] as const)
})
</script>

<template>
  <section v-if="poll && !poll.festival" class="rounded-2xl border bg-card p-4" data-rsvp-summary>
    <h2 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Who’s coming</h2>
    <p class="mt-2 text-sm font-bold">{{ poll.line }}</p>
    <ul class="mt-2 flex flex-wrap gap-2 text-sm">
      <li v-for="c in chips" :key="String(c.id)">
        <button
          type="button"
          class="rounded-full px-3 py-1 transition-colors"
          :class="filter === c.id ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'"
          :aria-pressed="filter === c.id"
          :disabled="!c.count"
          data-rsvp-chip
          @click="toggle(c.id)"
        >
          <span class="font-bold tabular-nums">{{ c.count }}</span> {{ c.label }}
        </button>
      </li>
    </ul>

    <p v-if="pairs.length" class="mt-3 text-sm" data-rsvp-pairs>
      <span class="font-bold">Could pair up:</span>
      <span v-for="([a, b], i) in pairs" :key="a.key">{{ i ? ' · ' : ' ' }}{{ signupDisplayName(a) }} &amp; {{ signupDisplayName(b) }}</span>
    </p>

    <ul v-if="shown.length" class="mt-3 grid gap-2 sm:grid-cols-2" data-rsvp-people>
      <li v-for="p in shown" :key="p.key" class="flex min-w-0 items-center gap-3">
        <Avatar class="size-9 shrink-0">
          <AvatarImage v-if="p.photo" :src="p.photo" :alt="signupDisplayName(p)" />
          <AvatarFallback>{{ p.name ? initialsOf(p.name) : '?' }}</AvatarFallback>
        </Avatar>
        <div class="min-w-0 text-sm">
          <NuxtLink v-if="p.username" :to="`/u/${p.username}`" class="block truncate font-bold hover:underline">{{ signupDisplayName(p) }}</NuxtLink>
          <span v-else class="block truncate font-bold" :class="{ 'text-muted-foreground': !p.name }">{{ signupDisplayName(p) }}</span>
          <span class="block truncate text-xs text-muted-foreground">
            {{ p.answer ? labelOf[p.answer] : 'Going (didn’t answer the poll)' }}<template v-if="p.ticket"> · ticket</template><template v-if="p.checkedIn"> · checked in</template><template v-if="!p.confirmed"> · not confirmed</template>
          </span>
        </div>
      </li>
    </ul>
    <p v-else-if="!people.length" class="mt-3 text-sm text-muted-foreground">Nobody yet. Names show here as people answer.</p>

    <NuxtLink v-if="contactsTo && people.length" :to="contactsTo" class="mt-3 inline-block text-sm font-bold underline-offset-2 hover:underline" data-rsvp-contacts>See their contacts →</NuxtLink>

    <p v-if="poll.unconfirmed" class="mt-3 text-xs text-muted-foreground">Not confirmed: answered without an account yet, so there’s no name. They count for 48 hours unless confirmed by email.</p>

    <!-- RAZ-1007: the night, item by item (bookings × what each dancer ticked) -->
    <div v-if="night && night.items.length" class="mt-4 border-t pt-4 space-y-4" data-rsvp-night>
      <div class="space-y-2">
        <p class="text-xs font-bold uppercase tracking-widest text-secondary">By programme item</p>
        <div v-for="it in night.items" :key="it.id" class="rounded-xl border px-3 py-2 text-sm" :data-rsvp-night-item="it.id">
          <div class="flex items-center gap-3">
            <span class="w-12 font-bold tabular-nums">{{ it.time }}</span>
            <span class="flex-1 min-w-0 truncate font-bold">{{ it.title }}</span>
            <span class="text-lg font-black tabular-nums">{{ it.people }}</span>
          </div>
          <p v-if="it.type === 'workshop' && (it.leaders || it.followers)" class="mt-0.5 pl-[3.75rem] text-xs text-muted-foreground">
            {{ it.leaders }} leader{{ it.leaders === 1 ? '' : 's' }} · {{ it.followers }} follower{{ it.followers === 1 ? '' : 's' }}<template v-if="it.leaders !== it.followers"> — {{ Math.abs(it.leaders - it.followers) }} more {{ it.leaders > it.followers ? 'leader' : 'follower' }}{{ Math.abs(it.leaders - it.followers) === 1 ? '' : 's' }}</template>
          </p>
        </div>
      </div>
      <div v-if="night.arrivals.length" class="space-y-1.5">
        <p class="text-xs font-bold uppercase tracking-widest text-secondary">When they arrive</p>
        <div v-for="a in night.arrivals" :key="a.id" class="flex items-center gap-3 text-sm">
          <span class="w-12 font-bold tabular-nums">{{ a.time }}</span>
          <div class="flex-1 h-2.5 rounded-full bg-muted overflow-hidden"><div class="h-full rounded-full bg-primary/70" :style="{ width: `${a.people / maxArrival * 100}%` }" /></div>
          <span class="w-20 text-xs text-muted-foreground tabular-nums">~{{ a.people }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
