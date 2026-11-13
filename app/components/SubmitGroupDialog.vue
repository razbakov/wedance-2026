<script setup lang="ts">
/**
 * "Share a group" — a dancer adds a local WhatsApp / Telegram / Facebook group for a
 * city (communityGroup.submit). It waits for the city's admins, then shows on the
 * city's group list with "Added by <first name>". The same link twice is caught
 * (it says whether it is listed already or waiting).
 *
 *   <SubmitGroupDialog v-model:open="open" :city-slug="slug" :city-name="name" />
 */
import { SubmitGroupSchema } from '#shared/validation'
import { Check } from 'lucide-vue-next'
import { platformOf } from '#shared/utils/communityGroups'

const props = defineProps<{ open: boolean; citySlug: string; cityName?: string }>()
const emit = defineEmits<{ 'update:open': [boolean]; submitted: [] }>()

const { $trpc } = useNuxtApp()
const { track } = useTrack()

const form = reactive({ name: '', platform: 'whatsapp' as 'whatsapp' | 'telegram' | 'facebook' | 'other', inviteUrl: '', styles: '', description: '' })
const { errors, validate, reset, fieldAttrs } = useFormValidation(SubmitGroupSchema, form)
const saving = ref(false)
const error = ref<string | null>(null)
const done = ref<null | 'pending' | 'listed' | 'waiting'>(null)

watch(() => props.open, (o) => {
  if (!o) return
  Object.assign(form, { name: '', platform: 'whatsapp', inviteUrl: '', styles: '', description: '' })
  reset()
  error.value = null
  done.value = null
})

// Pasting a link picks its platform.
watch(() => form.inviteUrl, (url) => {
  const p = platformOf(url)
  if (p === 'whatsapp' || p === 'telegram' || p === 'facebook') form.platform = p
})

async function submit() {
  error.value = null
  const result = validate()
  if (!result.success) return
  saving.value = true
  try {
    const r = await $trpc.communityGroup.submit.mutate({
      citySlug: props.citySlug,
      name: result.data.name,
      platform: result.data.platform,
      inviteUrl: result.data.inviteUrl,
      styles: result.data.styles,
      description: result.data.description ?? null,
    })
    track('community_group_submitted', { city: props.citySlug, platform: result.data.platform, duplicate: r.duplicate })
    done.value = !r.duplicate ? 'pending' : r.status === 'pending' ? 'waiting' : 'listed'
    if (!r.duplicate) emit('submitted')
  } catch (e: any) {
    error.value = e?.message || 'That didn’t work. Try again.'
  } finally {
    saving.value = false
  }
}

const platformOptions = [
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Telegram', value: 'telegram' },
  { label: 'Facebook', value: 'facebook' },
  { label: 'Other', value: 'other' },
]
const doneText = {
  pending: 'Thanks! The city’s admins check it, then it shows here with your name.',
  waiting: 'Someone shared this group already. It’s waiting for the city’s admins.',
  listed: 'This group is listed already. Thanks for checking!',
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Share a group{{ cityName ? ` in ${cityName}` : '' }}</DialogTitle>
        <DialogDescription>A WhatsApp, Telegram or Facebook group where dancers here meet. Open invite links only.</DialogDescription>
      </DialogHeader>

      <div v-if="done" class="flex items-start gap-2 rounded-xl bg-wd-green-600/10 p-4 text-sm text-foreground" role="status">
        <Check class="size-4 mt-0.5 shrink-0 text-wd-green-700" aria-hidden="true" />
        <p>{{ doneText[done] }}</p>
      </div>

      <form v-else class="grid gap-4" novalidate @submit.prevent="submit">
        <Field id="sg-inviteUrl" label="Invite link" :error="errors.inviteUrl">
          <Input v-model="form.inviteUrl" type="url" inputmode="url" placeholder="https://chat.whatsapp.com/…" v-bind="fieldAttrs('inviteUrl', 'sg-inviteUrl-error')" />
        </Field>
        <div class="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field id="sg-name" label="Group name" :error="errors.name">
            <Input v-model="form.name" placeholder="e.g. Bachata Munich Socials" v-bind="fieldAttrs('name', 'sg-name-error')" />
          </Field>
          <Field id="sg-platform" label="App">
            <Select v-model="form.platform" :options="platformOptions" />
          </Field>
        </div>
        <Field id="sg-styles" label="Styles" hint="Comma-separated" optional>
          <Input v-model="form.styles" placeholder="Salsa, Bachata" />
        </Field>
        <Field id="sg-description" label="What’s it for?" optional :error="errors.description">
          <Input v-model="form.description" placeholder="e.g. Party announcements, rides, practice partners" v-bind="fieldAttrs('description', 'sg-description-error')" />
        </Field>
        <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
        <DialogFooter>
          <Button type="button" variant="outline-pill" @click="emit('update:open', false)">Cancel</Button>
          <Button type="submit" variant="pill" :loading="saving">Share group</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
