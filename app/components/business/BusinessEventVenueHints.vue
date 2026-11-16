<script setup lang="ts">
/**
 * The event's venue step (RAZ-1012): the picked venue's "Getting there & house rules", saved on the
 * venue's page so every event there shows them. Its team and WeDance admins edit any venue; an
 * organiser edits an unclaimed venue their event is at (listedProfiles.venueInfo / saveVenueInfo).
 * A venue someone else runs is shown read-only.
 *
 *   <BusinessEventVenueHints username="dachau.meet-and-dance.de" />
 */
import { ChevronDown, Check } from 'lucide-vue-next'
import { venueHints, venueInfoToForm, venueInfoFromForm, type VenueInfoForm } from '#shared/types/venueInfo'

const props = defineProps({ username: { type: String, required: true } })
const { $trpc } = useNuxtApp()

const data = ref<Awaited<ReturnType<typeof $trpc.listedProfiles.venueInfo.query>> | null>(null)
const form = ref<VenueInfoForm>(venueInfoToForm(null))
const saved = ref('')
const open = ref(false)
const saving = ref(false)
const error = ref('')
const justSaved = ref(false)

async function load() {
  data.value = null
  error.value = ''
  try {
    data.value = await $trpc.listedProfiles.venueInfo.query({ username: props.username })
    form.value = venueInfoToForm(data.value.info)
    saved.value = JSON.stringify(form.value)
  } catch { /* not a venue page: nothing to show */ }
}
watch(() => props.username, load, { immediate: true })

const hints = computed(() => venueHints(data.value?.info))
const dirty = computed(() => JSON.stringify(form.value) !== saved.value)
const summary = computed(() => hints.value.length ? hints.value.map(h => h.kind === 'cloakroom' ? 'No cloakroom' : h.kind === 'transit' && h.line ? `${h.line} ${h.title}` : h.title).join(' · ') : 'Nothing yet')

async function save() {
  saving.value = true
  error.value = ''
  try {
    const r = await $trpc.listedProfiles.saveVenueInfo.mutate({ username: props.username, info: venueInfoFromForm(form.value) })
    if (data.value) data.value = { ...data.value, info: r.info }
    form.value = venueInfoToForm(r.info)
    saved.value = JSON.stringify(form.value)
    justSaved.value = true
    setTimeout(() => { justSaved.value = false }, 2500)
  } catch (e: any) {
    error.value = e?.message || 'Could not save.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="data" class="rounded-xl border border-border p-3" data-event-venue-hints>
    <button type="button" class="flex w-full items-start justify-between gap-2 text-left cursor-pointer" :aria-expanded="open" @click="open = !open">
      <span class="min-w-0">
        <span class="block text-sm font-bold">Getting there &amp; house rules at {{ data.name }}</span>
        <span class="block text-xs text-muted-foreground">{{ summary }}</span>
      </span>
      <ChevronDown class="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform" :class="open ? 'rotate-180' : ''" aria-hidden="true" />
    </button>
    <div v-if="open" class="mt-3">
      <template v-if="data.canEdit">
        <p class="text-xs text-muted-foreground">Saved on the venue’s page: every event there shows them when dancers open the venue.</p>
        <BusinessVenueHints v-model="form" :id-prefix="`ev-hints-${username}`" class="mt-3" />
        <div class="mt-3 flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" :disabled="!dirty || saving" data-event-venue-hints-save @click="save">{{ saving ? 'Saving…' : 'Save for this venue' }}</Button>
          <span v-if="justSaved" class="inline-flex items-center gap-1 text-xs font-bold text-success" role="status"><Check class="size-3.5" aria-hidden="true" /> Saved</span>
          <NuxtLink v-if="data.team" :to="`/business/network/${data.username}`" class="text-xs font-bold text-secondary hover:underline">All of the venue’s details</NuxtLink>
        </div>
        <p v-if="error" class="mt-2 text-sm text-destructive" role="alert">{{ error }}</p>
      </template>
      <p v-else class="text-sm text-muted-foreground">{{ data.why }}</p>
    </div>
  </div>
</template>
