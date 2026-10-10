<script setup lang="ts">
/**
 * /admin/community-groups — list every community chat group and add new ones.
 * `admin` layout provides the sidebar + is_admin gate. Data via
 * communityGroup.listAll / .create (adminProcedure).
 */
import { Loader2, Plus, ExternalLink, RotateCcw, CheckCircle2 } from 'lucide-vue-next'
import { CommunityGroupSchema } from '#shared/validation'
import { WD } from '~/lib/brand'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Admin: Community groups | WeDance' })

const { $trpc } = useNuxtApp()

type Group = {
  id: string
  citySlug: string
  name: string
  platform: 'whatsapp' | 'telegram' | 'facebook' | 'other'
  inviteUrl: string
  styles: string[]
  source: string | null
  verified: boolean | null
  status: 'visible' | 'hidden'
  createdAt: string | Date | null
}

const items = ref<Group[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    items.value = (await $trpc.communityGroup.listAll.query({})) as Group[]
  } catch (e: any) {
    error.value = e?.message || 'Failed to load community groups.'
  } finally {
    loading.value = false
  }
}
onMounted(load)

const showForm = ref(false)
const saving = ref(false)
const form = reactive({
  citySlug: '', name: '', platform: 'whatsapp' as Group['platform'], inviteUrl: '', styles: '', source: '', verified: false,
})
const { errors, validate, reset: resetValidation, fieldAttrs } = useFormValidation(CommunityGroupSchema, form)
function resetForm() {
  Object.assign(form, { citySlug: '', name: '', platform: 'whatsapp', inviteUrl: '', styles: '', source: '', verified: false })
  resetValidation()
}

async function submit() {
  error.value = null
  const result = validate()
  if (!result.success) return
  saving.value = true
  try {
    await $trpc.communityGroup.create.mutate(result.data)
    resetForm()
    showForm.value = false
    await load()
  } catch (e: any) {
    error.value = e?.message || 'Could not create group.'
  } finally {
    saving.value = false
  }
}

const platformColor: Record<string, string> = { whatsapp: WD.green600, telegram: WD.cyan600, facebook: '#4267B2', other: WD.amber600 }
const inputCls = 'w-full h-10 rounded-xl px-3 text-sm outline-none'
const inputStyle = 'background:#fbf5ea; border:1px solid #3b1f0d33; font-family: system-ui, sans-serif;'
</script>

<template>
  <div>
    <div class="flex items-baseline justify-between gap-3">
      <h1 class="text-3xl sm:text-4xl leading-tight" style="font-family:var(--wd-font-display); color:var(--wd-brown-900);">
        Community <em class="italic" style="color:var(--wd-cyan-600);">groups</em>
      </h1>
      <div class="flex items-center gap-3">
        <button type="button" class="inline-flex items-center gap-1.5 text-xs font-bold hover:underline" style="color:var(--wd-amber-600); font-family:var(--wd-font-sans);" @click="load">
          <RotateCcw class="w-3.5 h-3.5" /> Refresh
        </button>
        <button type="button" class="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-white text-xs font-bold uppercase tracking-wider" style="background:var(--wd-cyan-600);" @click="showForm = !showForm">
          <Plus class="w-3.5 h-3.5" /> New
        </button>
      </div>
    </div>

    <div v-if="error" class="mt-6 rounded-xl border p-4 text-sm" style="border-color:color-mix(in srgb, var(--wd-red-600) 33.3%, transparent); background:var(--wd-red-50); color:var(--wd-red-900); font-family:var(--wd-font-sans);">
      {{ error }}
    </div>

    <div v-if="showForm" class="mt-6 rounded-2xl bg-white border p-5" style="border-color:color-mix(in srgb, var(--wd-cyan-600) 20%, transparent);">
      <h2 class="text-sm font-bold uppercase tracking-wider mb-4" style="color:var(--wd-cyan-600);">New group</h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <input v-model="form.citySlug" placeholder="City slug (e.g. munich)" :class="inputCls" :style="inputStyle" v-bind="fieldAttrs('citySlug', 'group-citySlug-error')">
          <FieldError id="group-citySlug-error" :message="errors.citySlug" />
        </div>
        <div>
          <input v-model="form.name" placeholder="Group name" :class="inputCls" :style="inputStyle" v-bind="fieldAttrs('name', 'group-name-error')">
          <FieldError id="group-name-error" :message="errors.name" />
        </div>
        <select v-model="form.platform" :class="inputCls" :style="inputStyle">
          <option value="whatsapp">WhatsApp</option>
          <option value="telegram">Telegram</option>
          <option value="facebook">Facebook</option>
          <option value="other">Other</option>
        </select>
        <div>
          <input v-model="form.inviteUrl" placeholder="Invite URL (https://…)" :class="inputCls" :style="inputStyle" v-bind="fieldAttrs('inviteUrl', 'group-inviteUrl-error')">
          <FieldError id="group-inviteUrl-error" :message="errors.inviteUrl" />
        </div>
        <input v-model="form.styles" placeholder="Styles (comma-separated)" :class="inputCls" :style="inputStyle">
        <div>
          <input v-model="form.source" placeholder="Source (optional)" :class="inputCls" :style="inputStyle" v-bind="fieldAttrs('source', 'group-source-error')">
          <FieldError id="group-source-error" :message="errors.source" />
        </div>
        <label class="flex items-center gap-2 text-xs sm:col-span-2" style="color:var(--wd-brown-700); font-family:var(--wd-font-sans);">
          <input v-model="form.verified" type="checkbox" class="w-4 h-4 accent-wd-cyan-600"> Verified
        </label>
      </div>
      <div class="mt-4 flex gap-2">
        <button type="button" class="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50" style="background:var(--wd-cyan-600);" :disabled="saving" @click="submit">
          <Loader2 v-if="saving" class="w-3.5 h-3.5 animate-spin" /> Create
        </button>
        <button type="button" class="rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider" style="border:1px solid color-mix(in srgb, var(--wd-brown-900) 20%, transparent); color:var(--wd-brown-700);" @click="showForm = false">Cancel</button>
      </div>
    </div>

    <div v-if="loading" class="flex items-center gap-2 py-16 justify-center" style="color:var(--wd-amber-600);">
      <Loader2 class="w-5 h-5 animate-spin" /> <span class="text-sm italic">Loading…</span>
    </div>

    <div v-else-if="!items.length" class="mt-8 rounded-2xl border-2 border-dashed p-10 text-center" style="border-color:color-mix(in srgb, var(--wd-brown-900) 20%, transparent);">
      <p class="text-sm font-bold" style="color:var(--wd-brown-900);">No community groups yet.</p>
    </div>

    <div v-else class="mt-6 grid gap-3">
      <div v-for="grp in items" :key="grp.id" class="rounded-2xl bg-white border p-4" style="border-color:color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5" style="background:color-mix(in srgb, var(--wd-cyan-600) 10.2%, transparent); color:var(--wd-cyan-600);">{{ grp.citySlug }}</span>
          <span class="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5" :style="{ background: (platformColor[grp.platform] || WD.amber600) + '1a', color: platformColor[grp.platform] || WD.amber600 }">{{ grp.platform }}</span>
          <CheckCircle2 v-if="grp.verified" class="w-3.5 h-3.5" style="color:var(--wd-green-600);" />
          <span v-if="grp.status === 'hidden'" class="text-[10px] uppercase tracking-wider" style="color:var(--wd-red-600);">hidden</span>
        </div>
        <h3 class="mt-1.5 text-base font-bold leading-tight" style="color:var(--wd-brown-900);">{{ grp.name }}</h3>
        <p v-if="grp.styles?.length" class="text-xs" style="color:var(--wd-brown-700); font-family:var(--wd-font-sans);">{{ grp.styles.join(' · ') }}</p>
        <a :href="grp.inviteUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-1 mt-1 text-xs font-bold hover:underline" style="color:var(--wd-cyan-600); font-family:var(--wd-font-sans);">Invite link <ExternalLink class="w-3 h-3" /></a>
      </div>
    </div>
  </div>
</template>
