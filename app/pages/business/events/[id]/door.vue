<script setup lang="ts">
/**
 * Door check-in (RAZ-928). A phone list of everyone expected tonight — RSVP
 * (not "next time"), Going!, ticket, festival pass — with a search and one
 * tap to mark them here. The count is the same one on the event's Who's coming.
 * Names only: email and phone stay in Contacts.
 */
import { rsvpOptions, type RsvpAnswer } from '#shared/utils/rsvp'
import { doorGuestMatches } from '#shared/utils/doorList'
import { initialsOf } from '#shared/utils/initials'

definePageMeta({ layout: 'business' })

const route = useRoute()
const { $trpc } = useNuxtApp()
const id = computed(() => String(route.params.id))

type Door = Awaited<ReturnType<typeof $trpc.attendance.door.query>>
type Guest = Door['guests'][number]

const eventName = ref('Door')
const partner = ref(false)
const guests = ref<Guest[] | null>(null)
const error = ref<string | null>(null)
const q = ref('')
const tab = ref<'out' | 'here' | 'all'>('out')
const pending = ref<string | null>(null)

async function load() {
  error.value = null
  guests.value = null
  try {
    const door = await $trpc.attendance.door.query({ eventId: id.value })
    eventName.value = door.eventName
    partner.value = door.partner
    guests.value = door.guests
  } catch (e: any) {
    error.value = e?.message || 'Could not open the door list.'
  }
}
onMounted(load)
watch(id, (next, prev) => {
  if (prev === undefined || next === prev) return
  q.value = ''
  tab.value = 'out'
  load()
})

useHead(() => ({ title: `Door · ${eventName.value} | Business | WeDance` }))

const here = computed(() => (guests.value ?? []).filter(g => g.checkedIn).length)
const total = computed(() => guests.value?.length ?? 0)
const shown = computed(() => {
  const list = guests.value ?? []
  const query = q.value.trim()
  return list.filter(g => {
    if (query) return doorGuestMatches(g, query)
    if (tab.value === 'out') return !g.checkedIn
    if (tab.value === 'here') return g.checkedIn
    return true
  })
})

const options = computed(() => rsvpOptions(partner.value))
function detail(g: Guest) {
  const bits: string[] = []
  if (g.via === 'ticket') bits.push('Ticket')
  else if (g.via === 'going') bits.push('Going!')
  else bits.push(options.value.find(o => o.id === g.answer)?.label ?? 'RSVP')
  if (g.via === 'ticket' && g.answer) {
    const short = options.value.find(o => o.id === (g.answer as RsvpAnswer))?.short
    if (short) bits.push(short)
  }
  if (g.partnerName) bits.push(`with ${g.partnerName}`)
  if (!g.confirmed) bits.push('not confirmed')
  return bits.join(' · ')
}

function target(g: Guest) {
  if (g.attendanceId) return { attendanceId: g.attendanceId }
  if (g.dancerId) return { dancerId: g.dancerId }
  if (g.rsvpId) return { rsvpId: g.rsvpId }
  if (g.signupId) return { signupId: g.signupId }
  return null
}

async function toggle(g: Guest) {
  const which = target(g)
  if (!which || pending.value) return
  pending.value = g.key
  error.value = null
  try {
    const r = await $trpc.attendance.checkIn.mutate({ eventId: id.value, ...which, undo: g.checkedIn })
    const row = guests.value?.find(x => x.key === g.key)
    if (row) row.checkedIn = r.checkedIn
  } catch (e: any) {
    error.value = e?.message || 'Could not check them in.'
  } finally {
    pending.value = null
  }
}
</script>

<template>
  <div>
    <AdminPageHeader
      eyebrow="Door"
      :title="eventName"
      description="Find a guest and check them in. RSVPs, Going! and tickets are all here."
      :back="{ to: `/business/events/${id}`, label: 'Event' }"
    />

    <AdminState v-if="guests === null && error" kind="error" :message="error" class="mt-8" />
    <AdminState v-else-if="guests === null" kind="loading" class="mt-8" />

    <template v-else>
      <p class="mt-4 font-display text-3xl font-bold tabular-nums" data-door-count aria-live="polite">
        {{ here }} <span class="text-lg font-bold text-muted-foreground">of {{ total }} here</span>
      </p>
      <p class="mt-1 text-xs text-muted-foreground">This count is on the event’s Who’s coming. Emails and phones stay in Contacts.</p>

      <Field label="Find a guest" hide-label class="mt-4">
        <Input
          v-model="q"
          type="search"
          placeholder="Search by name"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          enterkeyhint="search"
          class="text-base"
        />
      </Field>

      <div class="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Who to show">
        <button
          v-for="c in [
            { id: 'out', label: 'Still out', n: total - here },
            { id: 'here', label: 'Here', n: here },
            { id: 'all', label: 'All', n: total },
          ]"
          :key="c.id"
          type="button"
          role="tab"
          class="min-h-11 rounded-full px-3.5 text-sm font-bold transition-colors"
          :class="tab === c.id && !q.trim() ? 'bg-primary text-primary-foreground' : 'bg-muted'"
          :aria-selected="tab === c.id && !q.trim()"
          @click="tab = c.id as 'out' | 'here' | 'all'; q = ''"
        >
          {{ c.label }} <span class="tabular-nums">{{ c.n }}</span>
        </button>
      </div>

      <p v-if="error" role="alert" class="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-bold text-destructive">{{ error }}</p>

      <ul v-if="shown.length" class="mt-3 grid gap-2" data-door-list>
        <li
          v-for="g in shown"
          :key="g.key"
          class="flex items-center gap-3 rounded-2xl border bg-card px-3 py-2.5"
          :class="g.checkedIn ? 'opacity-80' : ''"
          data-door-guest
        >
          <Avatar class="size-12 shrink-0">
            <AvatarImage v-if="g.photo" :src="g.photo" :alt="g.name" />
            <AvatarFallback>{{ g.name && !['Guest', 'Ticket', 'Dancer'].includes(g.name) ? initialsOf(g.name) : '?' }}</AvatarFallback>
          </Avatar>
          <div class="min-w-0 flex-1">
            <p class="truncate text-base font-bold">{{ g.name }}</p>
            <p class="truncate text-xs text-muted-foreground">{{ detail(g) }}</p>
          </div>
          <Button
            type="button"
            :variant="g.checkedIn ? 'outline-pill' : 'pill'"
            class="min-h-11 shrink-0 px-4"
            :loading="pending === g.key"
            :disabled="!!pending && pending !== g.key"
            :aria-label="g.checkedIn ? `Undo check-in for ${g.name}` : `Check in ${g.name}`"
            @click="toggle(g)"
          >
            {{ g.checkedIn ? 'Here' : 'Check in' }}
          </Button>
        </li>
      </ul>
      <p v-else-if="!total && !error" class="mt-6 rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
        Nobody to expect yet. RSVPs, Going! and tickets show up here.
      </p>
      <p v-else-if="q.trim()" class="mt-6 text-sm text-muted-foreground">No one matches “{{ q.trim() }}”.</p>
      <p v-else-if="tab === 'out'" class="mt-6 text-sm text-muted-foreground">Everyone on the list is here.</p>
      <p v-else class="mt-6 text-sm text-muted-foreground">Nobody checked in yet.</p>
    </template>
  </div>
</template>
