<script setup lang="ts">
/**
 * /admin/giveaways — list every sponsor giveaway and create new ones.
 * `admin` layout provides the sidebar + is_admin gate. Data via
 * giveaway.listAll / giveaway.create (adminProcedure).
 */
import { Loader2, Plus, ExternalLink, RotateCcw } from 'lucide-vue-next'

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
function resetForm() {
  Object.assign(form, {
    citySlug: '', sponsorName: '', title: '', description: '', prizeDescription: '',
    ctaUrl: '', imageUrl: '', termsUrl: '', startsAt: '', endsAt: '', status: 'active',
  })
}

async function submit() {
  error.value = null
  if (!form.citySlug || !form.sponsorName || !form.title || !form.ctaUrl || !form.startsAt || !form.endsAt) {
    error.value = 'Fill city, sponsor, title, CTA URL and the date window.'
    return
  }
  saving.value = true
  try {
    await $trpc.giveaway.create.mutate({
      citySlug: form.citySlug.trim(),
      sponsorName: form.sponsorName.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      prizeDescription: form.prizeDescription.trim(),
      ctaUrl: form.ctaUrl.trim(),
      imageUrl: form.imageUrl.trim() || undefined,
      termsUrl: form.termsUrl.trim() || undefined,
      startsAt: form.startsAt,
      endsAt: form.endsAt,
      status: form.status,
    })
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
const statusColor: Record<string, string> = { active: '#16a34a', ended: '#9a5614', draft: '#a855f7' }
const inputCls = 'w-full h-10 rounded-xl px-3 text-sm outline-none'
const inputStyle = 'background:#fbf5ea; border:1px solid #3b1f0d33; font-family: system-ui, sans-serif;'
</script>

<template>
  <div>
    <div class="flex items-baseline justify-between gap-3">
      <h1 class="text-3xl sm:text-4xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
        <em class="italic" style="color:#a855f7;">Giveaways</em>
      </h1>
      <div class="flex items-center gap-3">
        <button type="button" class="inline-flex items-center gap-1.5 text-xs font-bold hover:underline" style="color:#9a5614; font-family: system-ui, sans-serif;" @click="load">
          <RotateCcw class="w-3.5 h-3.5" /> Refresh
        </button>
        <button type="button" class="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-white text-xs font-bold uppercase tracking-wider" style="background:#a855f7;" @click="showForm = !showForm">
          <Plus class="w-3.5 h-3.5" /> New
        </button>
      </div>
    </div>

    <div v-if="error" class="mt-6 rounded-xl border p-4 text-sm" style="border-color:#dc262655; background:#fdecec; color:#991b1b; font-family: system-ui, sans-serif;">
      {{ error }}
    </div>

    <!-- Create form -->
    <div v-if="showForm" class="mt-6 rounded-2xl bg-white border p-5" style="border-color:#a855f733;">
      <h2 class="text-sm font-bold uppercase tracking-wider mb-4" style="color:#a855f7;">New giveaway</h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <input v-model="form.citySlug" placeholder="City slug (e.g. munich)" :class="inputCls" :style="inputStyle">
        <input v-model="form.sponsorName" placeholder="Sponsor name" :class="inputCls" :style="inputStyle">
        <input v-model="form.title" placeholder="Title" :class="inputCls" :style="inputStyle">
        <input v-model="form.prizeDescription" placeholder="Prize (e.g. 2 festival passes)" :class="inputCls" :style="inputStyle">
        <input v-model="form.description" placeholder="Short description" :class="`${inputCls} sm:col-span-2`" :style="inputStyle">
        <input v-model="form.ctaUrl" placeholder="CTA URL (https://…)" :class="inputCls" :style="inputStyle">
        <input v-model="form.imageUrl" placeholder="Image URL (optional)" :class="inputCls" :style="inputStyle">
        <input v-model="form.termsUrl" placeholder="Terms URL (optional)" :class="inputCls" :style="inputStyle">
        <select v-model="form.status" :class="inputCls" :style="inputStyle">
          <option value="active">active</option>
          <option value="draft">draft</option>
          <option value="ended">ended</option>
        </select>
        <label class="text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">Starts
          <input v-model="form.startsAt" type="date" :class="inputCls" :style="inputStyle"></label>
        <label class="text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">Ends
          <input v-model="form.endsAt" type="date" :class="inputCls" :style="inputStyle"></label>
      </div>
      <div class="mt-4 flex gap-2">
        <button type="button" class="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50" style="background:#a855f7;" :disabled="saving" @click="submit">
          <Loader2 v-if="saving" class="w-3.5 h-3.5 animate-spin" /> Create
        </button>
        <button type="button" class="rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider" style="border:1px solid #3b1f0d33; color:#5b3a1d;" @click="showForm = false">Cancel</button>
      </div>
    </div>

    <div v-if="loading" class="flex items-center gap-2 py-16 justify-center" style="color:#9a5614;">
      <Loader2 class="w-5 h-5 animate-spin" /> <span class="text-sm italic">Loading…</span>
    </div>

    <div v-else-if="!items.length" class="mt-8 rounded-2xl border-2 border-dashed p-10 text-center" style="border-color:#3b1f0d33;">
      <p class="text-sm font-bold" style="color:#3b1f0d;">No giveaways yet.</p>
      <p class="mt-1 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">Create one with “New”.</p>
    </div>

    <div v-else class="mt-6 grid gap-3">
      <div v-for="g in items" :key="g.id" class="rounded-2xl bg-white border p-4" style="border-color:#3b1f0d22;">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5" style="background:#a855f71a; color:#a855f7;">{{ g.citySlug }}</span>
          <span class="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5" :style="{ background: (statusColor[g.status] || '#9a5614') + '1a', color: statusColor[g.status] || '#9a5614' }">{{ g.status }}</span>
          <span class="text-[11px]" style="color:#9a5614;">{{ fmt(g.startsAt) }} → {{ fmt(g.endsAt) }}</span>
        </div>
        <h3 class="mt-1.5 text-base font-bold leading-tight" style="color:#3b1f0d;">{{ g.title }}</h3>
        <p class="text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">{{ g.sponsorName }} · {{ g.prizeDescription }}</p>
        <a :href="g.ctaUrl" target="_blank" rel="noopener" class="inline-flex items-center gap-1 mt-1 text-xs font-bold hover:underline" style="color:#0891b2; font-family: system-ui, sans-serif;">CTA <ExternalLink class="w-3 h-3" /></a>
      </div>
    </div>
  </div>
</template>
