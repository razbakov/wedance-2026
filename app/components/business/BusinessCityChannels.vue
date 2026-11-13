<script setup lang="ts">
/**
 * The city's official channels (city channels, migration 0067): its Instagram (the page's
 * #501 connection) and the Telegram / WhatsApp / Facebook channels its admins run. They
 * are shown on the city page ("Get the dance week in your feed"); Telegram ones with an
 * @name or chat id also get the weekly post from the WeDance bot ("Check bot").
 *
 *   <BusinessCityChannels city-slug="munich" />
 */
import { Plus, Send, Instagram, MessageCircle, Pencil, Trash2, ShieldCheck, ExternalLink } from 'lucide-vue-next'
import { CityChannelSchema } from '#shared/validation'
import { platformOf, telegramNameOf } from '#shared/utils/communityGroups'

const props = defineProps<{ citySlug: string }>()
const { $trpc } = useNuxtApp()

type Data = Awaited<ReturnType<typeof $trpc.cityChannels.channels.query>>
const data = ref<Data | null>(null)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const busy = ref<string | null>(null)
const checks = reactive<Record<string, { ok: boolean; message: string }>>({})

async function load() {
  try { data.value = await $trpc.cityChannels.channels.query({ citySlug: props.citySlug }) }
  catch (e: any) { error.value = e?.message || 'Couldn’t load the channels.' }
}
onMounted(load)

type Platform = 'telegram' | 'whatsapp' | 'instagram' | 'facebook' | 'other'
const editing = ref<string | 'new' | null>(null)
const form = reactive({ name: '', platform: 'telegram' as Platform, inviteUrl: '', telegramChatId: '', description: '' })
const { errors, validate, reset, fieldAttrs } = useFormValidation(CityChannelSchema, form)

function open(c?: Data['channels'][number]) {
  reset()
  error.value = null
  editing.value = c?.id ?? 'new'
  Object.assign(form, c
    ? { name: c.name, platform: c.platform as Platform, inviteUrl: c.inviteUrl, telegramChatId: c.telegramChatId ?? '', description: c.description ?? '' }
    : { name: '', platform: 'telegram', inviteUrl: '', telegramChatId: '', description: '' })
}

watch(() => form.inviteUrl, (url) => {
  const p = platformOf(url)
  if (p && p !== 'other') form.platform = p as Platform
  if (form.platform === 'telegram' && !form.telegramChatId) form.telegramChatId = telegramNameOf(url) ?? ''
})

async function save() {
  const result = validate()
  if (!result.success) return
  busy.value = 'save'
  error.value = null
  try {
    await $trpc.cityChannels.saveChannel.mutate({
      citySlug: props.citySlug,
      id: editing.value && editing.value !== 'new' ? editing.value : undefined,
      platform: result.data.platform,
      name: result.data.name,
      inviteUrl: result.data.inviteUrl,
      telegramChatId: result.data.telegramChatId ?? null,
      description: result.data.description ?? null,
    })
    editing.value = null
    notice.value = 'Saved. It shows on the city page.'
    await load()
  } catch (e: any) {
    error.value = e?.message || 'Couldn’t save the channel.'
  } finally {
    busy.value = null
  }
}

async function remove(id: string) {
  if (!confirm('Remove this channel from the city page?')) return
  busy.value = id
  try { await $trpc.cityChannels.removeChannel.mutate({ id }); await load() }
  catch (e: any) { error.value = e?.message || 'Couldn’t remove it.' }
  finally { busy.value = null }
}

async function check(id: string) {
  busy.value = `check-${id}`
  try { checks[id] = await $trpc.cityChannels.checkTelegram.mutate({ id }) }
  catch (e: any) { checks[id] = { ok: false, message: e?.message || 'Couldn’t check.' } }
  finally { busy.value = null }
}

const icon = (p: string) => (p === 'instagram' ? Instagram : p === 'telegram' ? Send : MessageCircle)
const platformOptions = [
  { label: 'Telegram', value: 'telegram' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'Facebook', value: 'facebook' },
  { label: 'Other', value: 'other' },
]
</script>

<template>
  <section class="rounded-2xl border bg-card p-5 shadow-wd-card">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="font-display text-lg font-bold text-foreground">Channels</h2>
        <p class="text-sm text-muted-foreground">Where {{ data?.cityName ?? 'the city' }} follows WeDance. Shown on the city page, under this week’s events.</p>
      </div>
      <Button v-if="editing === null" type="button" variant="pill" size="pill-sm" @click="open()"><Plus /> Add channel</Button>
    </div>

    <p v-if="error" class="mt-4 text-sm text-destructive" role="alert">{{ error }}</p>
    <p v-if="notice" class="mt-4 text-sm text-wd-green-700" role="status">{{ notice }}</p>

    <ul v-if="data" class="mt-4 grid gap-2">
      <li class="flex flex-wrap items-center gap-2 rounded-xl border p-3">
        <Instagram class="size-4 text-primary" aria-hidden="true" />
        <span class="text-sm font-bold">Instagram</span>
        <span v-if="data.instagram" class="text-sm">@{{ data.instagram.username }} <span class="text-muted-foreground">· connected, posts go here</span></span>
        <span v-else class="text-sm text-muted-foreground">not connected —
          <NuxtLink v-if="data.page" :to="`/business/network/${data.page.username}`" class="font-bold underline">connect it on @{{ data.page.username }}</NuxtLink>
        </span>
        <span v-if="data.instagram?.lastError" class="w-full text-xs text-destructive">{{ data.instagram.lastError }}</span>
      </li>
      <li v-for="c in data.channels" :key="c.id" class="rounded-xl border p-3">
        <div class="flex flex-wrap items-center gap-2">
          <component :is="icon(c.platform)" class="size-4 text-primary" aria-hidden="true" />
          <span class="text-sm font-bold">{{ c.name }}</span>
          <a :href="c.inviteUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-1 text-xs text-wd-cyan-700 hover:underline">{{ c.inviteUrl.replace(/^https?:\/\//, '') }} <ExternalLink class="size-3" aria-hidden="true" /></a>
          <span class="ml-auto flex items-center gap-1">
            <Button v-if="c.platform === 'telegram' && c.telegramChatId" type="button" variant="ghost" size="sm" class="h-7 text-xs" :loading="busy === `check-${c.id}`" @click="check(c.id)"><ShieldCheck /> Check bot</Button>
            <Button type="button" variant="ghost" size="icon-sm" :aria-label="`Edit ${c.name}`" @click="open(c)"><Pencil /></Button>
            <Button type="button" variant="ghost" size="icon-sm" :aria-label="`Remove ${c.name}`" :disabled="busy === c.id" @click="remove(c.id)"><Trash2 /></Button>
          </span>
        </div>
        <p v-if="c.platform === 'telegram'" class="mt-1 text-xs text-muted-foreground">
          {{ c.telegramChatId ? `Bot posts to ${c.telegramChatId}.` : 'Shown on the city page only: add its @name (or chat id) so the bot can post the weekly schedule.' }}
        </p>
        <p v-if="checks[c.id]" class="mt-1 text-xs" :class="checks[c.id]!.ok ? 'text-wd-green-700' : 'text-destructive'">{{ checks[c.id]!.message }}</p>
      </li>
    </ul>

    <form v-if="editing !== null" class="mt-4 rounded-xl border p-4 grid gap-4" novalidate @submit.prevent="save">
      <Field id="cc-inviteUrl" label="Link" :error="errors.inviteUrl">
        <Input v-model="form.inviteUrl" type="url" placeholder="https://t.me/wedancemunich" v-bind="fieldAttrs('inviteUrl', 'cc-inviteUrl-error')" />
      </Field>
      <div class="grid gap-4 sm:grid-cols-[1fr_auto]">
        <Field id="cc-name" label="Name" :error="errors.name">
          <Input v-model="form.name" placeholder="WeDance Munich" v-bind="fieldAttrs('name', 'cc-name-error')" />
        </Field>
        <Field id="cc-platform" label="App">
          <Select v-model="form.platform" :options="platformOptions" />
        </Field>
      </div>
      <Field v-if="form.platform === 'telegram'" id="cc-chat" label="Chat for the bot" optional :error="errors.telegramChatId"
             hint="The channel’s @name, or its number (-100…) for a private one. Then add the WeDance bot as an administrator allowed to post.">
        <Input v-model="form.telegramChatId" placeholder="@wedancemunich" v-bind="fieldAttrs('telegramChatId', 'cc-chat-error')" />
      </Field>
      <Field id="cc-description" label="Short description" optional :error="errors.description">
        <Input v-model="form.description" placeholder="Weekly schedule and party news" v-bind="fieldAttrs('description', 'cc-description-error')" />
      </Field>
      <div class="flex gap-2">
        <Button type="submit" variant="pill" :loading="busy === 'save'">Save</Button>
        <Button type="button" variant="outline-pill" @click="editing = null">Cancel</Button>
      </div>
    </form>
  </section>
</template>
