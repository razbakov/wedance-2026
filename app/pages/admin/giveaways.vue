<script setup lang="ts">
/**
 * /admin/giveaways — list every sponsor giveaway and create new ones.
 * `admin` layout provides the sidebar + is_admin gate. Data via
 * giveaway.listAll / giveaway.create (adminProcedure).
 */
import { Loader2, Plus, ExternalLink, RotateCcw } from 'lucide-vue-next'
import { GiveawaySchema } from '#shared/validation'
import { WD } from '~/lib/brand'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Admin: Giveaways | WeDance' })

const { $trpc } = useNuxtApp()

type Giveaway = {
  id: string
  citySlug: string
  sponsorName: string
  title: string
  description: string
  prizeDescription: string
  ctaUrl: string
  imageUrl: string | null
  termsUrl: string | null
  startsAt: string | Date
  endsAt: string | Date
  status: 'active' | 'ended' | 'draft'
  createdAt: string | Date | null
}

const items = ref<Giveaway[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    items.value = (await $trpc.giveaway.listAll.query({})) as Giveaway[]
  } catch (e: any) {
    error.value = e?.message || 'Failed to load giveaways.'
  } finally {
    loading.value = false
  }
}
onMounted(load)

const showForm = ref(false)
const saving = ref(false)
const form = reactive({
  citySlug: '', sponsorName: '', title: '', description: '', prizeDescription: '',
  ctaUrl: '', imageUrl: '', termsUrl: '', startsAt: '', endsAt: '', status: 'active' as 'active' | 'ended' | 'draft',
})
const { errors, validate, reset: resetValidation, fieldAttrs } = useFormValidation(GiveawaySchema, form)
function resetForm() {
  resetValidation()
  Object.assign(form, {
    citySlug: '', sponsorName: '', title: '', description: '', prizeDescription: '',
    ctaUrl: '', imageUrl: '', termsUrl: '', startsAt: '', endsAt: '', status: 'active',
  })
}

async function submit() {
  error.value = null
  const result = validate()
  if (!result.success) return
  saving.value = true
  try {
    await $trpc.giveaway.create.mutate(result.data)
    resetForm()
    showForm.value = false
    await load()
  } catch (e: any) {
    error.value = e?.message || 'Could not create giveaway.'
  } finally {
    saving.value = false
  }
}

const fmt = (d: string | Date | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const statusColor: Record<string, string> = { active: WD.green600, ended: WD.amber600, draft: WD.purple500 }
const inputCls = 'w-full h-10 rounded-xl px-3 text-sm outline-none'
const inputStyle = 'background:#fbf5ea; border:1px solid #3b1f0d33; font-family: system-ui, sans-serif;'
</script>

<template>
  <div>
    <div class="flex items-baseline justify-between gap-3">
      <h1 class="text-3xl sm:text-4xl leading-tight" style="font-family:var(--wd-font-display); color:var(--wd-brown-900);">
        <em class="italic" style="color:var(--wd-purple-500);">Giveaways</em>
      </h1>
      <div class="flex items-center gap-3">
        <button type="button" class="inline-flex items-center gap-1.5 text-xs font-bold hover:underline" style="color:var(--wd-amber-600); font-family:var(--wd-font-sans);" @click="load">
          <RotateCcw class="w-3.5 h-3.5" /> Refresh
        </button>
        <button type="button" class="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-white text-xs font-bold uppercase tracking-wider" style="background:var(--wd-purple-500);" @click="showForm = !showForm">
          <Plus class="w-3.5 h-3.5" /> New
        </button>
      </div>
    </div>

    <div v-if="error" class="mt-6 rounded-xl border p-4 text-sm" style="border-color:color-mix(in srgb, var(--wd-red-600) 33.3%, transparent); background:var(--wd-red-50); color:var(--wd-red-900); font-family:var(--wd-font-sans);">
      {{ error }}
    </div>

    <!-- Create form -->
    <div v-if="showForm" class="mt-6 rounded-2xl bg-white border p-5" style="border-color:color-mix(in srgb, var(--wd-purple-500) 20%, transparent);">
      <h2 class="text-sm font-bold uppercase tracking-wider mb-4" style="color:var(--wd-purple-500);">New giveaway</h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <input v-model="form.citySlug" placeholder="City slug (e.g. munich)" :class="inputCls" :style="inputStyle" v-bind="fieldAttrs('citySlug', 'giveaway-citySlug-error')">
          <FieldError id="giveaway-citySlug-error" :message="errors.citySlug" />
        </div>
        <div>
          <input v-model="form.sponsorName" placeholder="Sponsor name" :class="inputCls" :style="inputStyle" v-bind="fieldAttrs('sponsorName', 'giveaway-sponsorName-error')">
          <FieldError id="giveaway-sponsorName-error" :message="errors.sponsorName" />
        </div>
        <div>
          <input v-model="form.title" placeholder="Title" :class="inputCls" :style="inputStyle" v-bind="fieldAttrs('title', 'giveaway-title-error')">
          <FieldError id="giveaway-title-error" :message="errors.title" />
        </div>
        <div>
          <input v-model="form.prizeDescription" placeholder="Prize (e.g. 2 festival passes)" :class="inputCls" :style="inputStyle" v-bind="fieldAttrs('prizeDescription', 'giveaway-prizeDescription-error')">
          <FieldError id="giveaway-prizeDescription-error" :message="errors.prizeDescription" />
        </div>
        <div class="sm:col-span-2">
          <input v-model="form.description" placeholder="Short description" :class="inputCls" :style="inputStyle" v-bind="fieldAttrs('description', 'giveaway-description-error')">
          <FieldError id="giveaway-description-error" :message="errors.description" />
        </div>
        <div>
          <input v-model="form.ctaUrl" placeholder="CTA URL (https://…)" :class="inputCls" :style="inputStyle" v-bind="fieldAttrs('ctaUrl', 'giveaway-ctaUrl-error')">
          <FieldError id="giveaway-ctaUrl-error" :message="errors.ctaUrl" />
        </div>
        <div>
          <input v-model="form.imageUrl" placeholder="Image URL (optional)" :class="inputCls" :style="inputStyle" v-bind="fieldAttrs('imageUrl', 'giveaway-imageUrl-error')">
          <FieldError id="giveaway-imageUrl-error" :message="errors.imageUrl" />
        </div>
        <div>
          <input v-model="form.termsUrl" placeholder="Terms URL (optional)" :class="inputCls" :style="inputStyle" v-bind="fieldAttrs('termsUrl', 'giveaway-termsUrl-error')">
          <FieldError id="giveaway-termsUrl-error" :message="errors.termsUrl" />
        </div>
        <select v-model="form.status" :class="inputCls" :style="inputStyle">
          <option value="active">active</option>
          <option value="draft">draft</option>
          <option value="ended">ended</option>
        </select>
        <label class="text-xs" style="color:var(--wd-brown-700); font-family:var(--wd-font-sans);">Starts
          <input v-model="form.startsAt" type="date" :class="inputCls" :style="inputStyle" v-bind="fieldAttrs('startsAt', 'giveaway-startsAt-error')">
          <FieldError id="giveaway-startsAt-error" :message="errors.startsAt" /></label>
        <label class="text-xs" style="color:var(--wd-brown-700); font-family:var(--wd-font-sans);">Ends
          <input v-model="form.endsAt" type="date" :class="inputCls" :style="inputStyle" v-bind="fieldAttrs('endsAt', 'giveaway-endsAt-error')">
          <FieldError id="giveaway-endsAt-error" :message="errors.endsAt" /></label>
      </div>
      <div class="mt-4 flex gap-2">
        <button type="button" class="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50" style="background:var(--wd-purple-500);" :disabled="saving" @click="submit">
          <Loader2 v-if="saving" class="w-3.5 h-3.5 animate-spin" /> Create
        </button>
        <button type="button" class="rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider" style="border:1px solid color-mix(in srgb, var(--wd-brown-900) 20%, transparent); color:var(--wd-brown-700);" @click="showForm = false">Cancel</button>
      </div>
    </div>

    <div v-if="loading" class="flex items-center gap-2 py-16 justify-center" style="color:var(--wd-amber-600);">
      <Loader2 class="w-5 h-5 animate-spin" /> <span class="text-sm italic">Loading…</span>
    </div>

    <div v-else-if="!items.length" class="mt-8 rounded-2xl border-2 border-dashed p-10 text-center" style="border-color:color-mix(in srgb, var(--wd-brown-900) 20%, transparent);">
      <p class="text-sm font-bold" style="color:var(--wd-brown-900);">No giveaways yet.</p>
      <p class="mt-1 text-xs" style="color:var(--wd-brown-700); font-family:var(--wd-font-sans);">Create one with “New”.</p>
    </div>

    <div v-else class="mt-6 grid gap-3">
      <div v-for="g in items" :key="g.id" class="rounded-2xl bg-white border p-4" style="border-color:color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5" style="background:color-mix(in srgb, var(--wd-purple-500) 10.2%, transparent); color:var(--wd-purple-500);">{{ g.citySlug }}</span>
          <span class="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5" :style="{ background: (statusColor[g.status] || WD.amber600) + '1a', color: statusColor[g.status] || WD.amber600 }">{{ g.status }}</span>
          <span class="text-[11px]" style="color:var(--wd-amber-600);">{{ fmt(g.startsAt) }} → {{ fmt(g.endsAt) }}</span>
        </div>
        <h3 class="mt-1.5 text-base font-bold leading-tight" style="color:var(--wd-brown-900);">{{ g.title }}</h3>
        <p class="text-xs" style="color:var(--wd-brown-700); font-family:var(--wd-font-sans);">{{ g.sponsorName }} · {{ g.prizeDescription }}</p>
        <a :href="g.ctaUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-1 mt-1 text-xs font-bold hover:underline" style="color:var(--wd-cyan-600); font-family:var(--wd-font-sans);">CTA <ExternalLink class="w-3 h-3" /></a>
      </div>
    </div>
  </div>
</template>
