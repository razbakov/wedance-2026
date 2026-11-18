<script setup lang="ts">
/**
 * Delete a page made by mistake (RAZ-944). Owners only (business.deleteCheck /
 * deletePage). Only a page nothing uses can go; otherwise the dialog says what
 * uses it and points to merging it into another page (Duplicates, below).
 */
import { Trash2, Loader2 } from 'lucide-vue-next'

const props = defineProps({
  username: { type: String, required: true },
})
const emit = defineEmits<{ deleted: [username: string] }>()

const { $trpc } = useNuxtApp()
const { track } = useTrack()
type Check = Awaited<ReturnType<typeof $trpc.business.deleteCheck.query>>
const open = ref(false)
const check = ref<Check | null>(null)
const error = ref<string | null>(null)
const confirm = ref('')
const deleting = ref(false)

watch(open, async (v) => {
  if (!v) return
  check.value = null
  error.value = null
  confirm.value = ''
  try {
    check.value = await $trpc.business.deleteCheck.query({ username: props.username })
  } catch (e: any) { error.value = e?.message || 'Couldn’t check the page.' }
})

const typed = computed(() => confirm.value.trim().replace(/^@/, '').toLowerCase() === props.username.toLowerCase())
const goes = computed(() => {
  const l = check.value?.loses
  if (!l) return []
  return [
    l.team > 1 && `${l.team} people lose access to it`,
    l.followers > 0 && `${l.followers} ${l.followers === 1 ? 'follower' : 'followers'}`,
    l.website && 'its website',
    l.instagram && 'its Instagram connection',
  ].filter(Boolean) as string[]
})

async function remove() {
  if (!typed.value) return
  deleting.value = true
  error.value = null
  try {
    await $trpc.business.deletePage.mutate({ username: props.username, confirm: confirm.value })
    track('page_deleted', { profile: props.username })
    open.value = false
    emit('deleted', props.username)
  } catch (e: any) {
    error.value = e?.message || 'Couldn’t delete the page.'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <section class="rounded-2xl border bg-card p-5 shadow-wd-card">
    <h2 class="text-eyebrow font-bold uppercase tracking-[0.3em] text-secondary">Delete page</h2>
    <p class="mt-1 text-sm text-muted-foreground">
      Made this page by mistake? Delete it. If it already has events or bookings, merge it into your other page instead.
    </p>
    <Button type="button" variant="destructive" size="sm" class="mt-4" @click="open = true"><Trash2 /> Delete page</Button>

    <Dialog v-model:open="open">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{{ check?.blocker ? `@${username} can’t be deleted` : `Delete @${username}?` }}</DialogTitle>
          <DialogDescription>{{ check?.blocker ? 'Other things on WeDance use this page.' : 'This can’t be undone. The page and its address go for good.' }}</DialogDescription>
        </DialogHeader>

        <div v-if="!check && !error" class="flex justify-center py-4"><Loader2 class="size-5 animate-spin text-muted-foreground" aria-hidden="true" /></div>
        <template v-else-if="check">
          <template v-if="check.blocker">
            <p class="text-sm" data-testid="delete-blocker">{{ check.blocker }}</p>
            <div><Button type="button" variant="outline-pill" size="pill-sm" @click="open = false">OK</Button></div>
          </template>
          <form v-else class="grid gap-4" novalidate @submit.prevent="remove">
            <p v-if="goes.length" class="text-sm">Also gone: {{ goes.join(', ') }}.</p>
            <Field id="delete-page-confirm" :label="`Type ${username} to confirm`">
              <Input v-model="confirm" autocapitalize="off" autocomplete="off" spellcheck="false" :placeholder="username" />
            </Field>
            <AdminState v-if="error" kind="error" :message="error" />
            <div class="flex gap-2">
              <Button type="submit" variant="destructive" :disabled="!typed" :loading="deleting"><Trash2 /> Delete for good</Button>
              <Button type="button" variant="ghost" @click="open = false">Cancel</Button>
            </div>
          </form>
        </template>
        <AdminState v-if="error && !check" kind="error" :message="error" />
      </DialogContent>
    </Dialog>
  </section>
</template>
