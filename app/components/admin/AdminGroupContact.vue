<script setup lang="ts">
/**
 * Who runs a local group and how to reach them (RAZ-967) — for WeDance admins
 * (Admin → Community groups) and the city's admins (city page → Local groups), so they can
 * ask the group's admin to share the weekly post or fix a dead link. One name + one contact
 * (phone, WhatsApp / Telegram link, @handle, email); saved by communityGroup.setAdmin.
 *
 * Personal data: `ph-no-capture` keeps it out of PostHog session replays and autocapture,
 * and nothing here is tracked.
 *
 *   <AdminGroupContact :group="g" @saved="load" />
 */
import { Pencil, UserRound, ExternalLink } from 'lucide-vue-next'
import { GroupAdminSchema } from '#shared/validation'
import { adminContactHref } from '#shared/utils/communityGroupAdmin'

const props = defineProps<{
  group: { id: string; platform: string; adminName?: string | null; adminContact?: string | null }
}>()
const emit = defineEmits<{ saved: [value: { adminName: string | null; adminContact: string | null }] }>()

const { $trpc } = useNuxtApp()
const editing = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const form = reactive({ adminName: '', adminContact: '' })
const { errors, validate, reset, fieldAttrs } = useFormValidation(GroupAdminSchema, form)

const href = computed(() => adminContactHref(props.group.adminContact, props.group.platform))
const has = computed(() => !!(props.group.adminName || props.group.adminContact))
const ids = computed(() => ({ name: `group-admin-name-${props.group.id}`, contact: `group-admin-contact-${props.group.id}` }))

function open() {
  form.adminName = props.group.adminName ?? ''
  form.adminContact = props.group.adminContact ?? ''
  error.value = null
  reset()
  editing.value = true
}

async function save() {
  const result = validate()
  if (!result.success) return
  saving.value = true
  error.value = null
  try {
    const saved = await $trpc.communityGroup.setAdmin.mutate({
      id: props.group.id,
      adminName: result.data.adminName ?? null,
      adminContact: result.data.adminContact ?? null,
    })
    editing.value = false
    emit('saved', saved)
  } catch (e: any) {
    error.value = e?.message || 'Couldn’t save the admin.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="ph-no-capture text-xs" data-testid="group-admin">
    <form v-if="editing" class="mt-2 grid gap-2 rounded-xl border bg-muted/30 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" novalidate @submit.prevent="save">
      <Field :id="ids.name" label="Group admin" optional :error="errors.adminName">
        <Input v-model="form.adminName" placeholder="e.g. Anna" autocomplete="off" v-bind="fieldAttrs('adminName', `${ids.name}-error`)" />
      </Field>
      <Field :id="ids.contact" label="Contact" optional :error="errors.adminContact">
        <Input v-model="form.adminContact" placeholder="+49 151 …, wa.me/…, @name" autocomplete="off" v-bind="fieldAttrs('adminContact', `${ids.contact}-error`)" />
      </Field>
      <span class="flex gap-1">
        <Button type="submit" variant="pill" size="pill-sm" :loading="saving">Save</Button>
        <Button type="button" variant="ghost" size="sm" class="h-8" @click="editing = false">Cancel</Button>
      </span>
      <p v-if="error" class="text-destructive sm:col-span-3" role="alert">{{ error }}</p>
      <p class="text-muted-foreground sm:col-span-3">Only WeDance admins and this city’s admins see this.</p>
    </form>
    <p v-else class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
      <template v-if="has">
        <UserRound class="size-3" aria-hidden="true" />
        <span>Admin: <span class="font-bold text-foreground">{{ group.adminName || 'name unknown' }}</span></span>
        <template v-if="group.adminContact">
          <a v-if="href" :href="href" target="_blank" rel="noopener" class="inline-flex items-center gap-1 font-bold text-wd-cyan-700 hover:underline">{{ group.adminContact }} <ExternalLink class="size-3" aria-hidden="true" /></a>
          <span v-else class="text-foreground">{{ group.adminContact }}</span>
        </template>
      </template>
      <Button type="button" variant="ghost" size="sm" class="h-6 px-2 text-xs" :aria-label="has ? 'Edit the group’s admin' : 'Add the group’s admin'" @click="open">
        <Pencil /> {{ has ? 'Edit' : 'Add admin' }}
      </Button>
    </p>
  </div>
</template>
