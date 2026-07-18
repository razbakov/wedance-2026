<script setup lang="ts">
/**
 * /admin/festivals — pick a festival to manage its dinner groups.
 * `admin` layout provides the sidebar + is_admin gate; list via
 * admin.listFestivals (adminProcedure).
 */
import { Loader2, ArrowRight, RotateCcw } from 'lucide-vue-next'

definePageMeta({ layout: 'admin' })
useHead({ title: 'Admin: Festivals | WeDance' })

const { $trpc } = useNuxtApp()

type Festival = { slug: string; name: string; startDate: string | null; endDate: string | null }
const items = ref<Festival[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    items.value = (await $trpc.admin.listFestivals.query()) as Festival[]
  } catch (e: any) {
    error.value = e?.message || 'Failed to load festivals.'
  } finally {
    loading.value = false
  }
}
onMounted(load)

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
</script>

<template>
  <div>
    <div class="flex items-baseline justify-between gap-3">
      <h1 class="text-3xl sm:text-4xl leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
        Festival <em class="italic" style="color:#16a34a;">dinners</em>
      </h1>
      <button type="button" class="inline-flex items-center gap-1.5 text-xs font-bold hover:underline" style="color:#9a5614; font-family: system-ui, sans-serif;" @click="load">
        <RotateCcw class="w-3.5 h-3.5" /> Refresh
      </button>
    </div>
    <p class="mt-1 text-sm italic" style="color:#5b3a1d;">Pick a festival to assign dinner groups and reveal restaurants.</p>

    <div v-if="error" class="mt-6 rounded-xl border p-4 text-sm" style="border-color:#dc262655; background:#fdecec; color:#991b1b; font-family: system-ui, sans-serif;">
      {{ error }}
    </div>

    <div v-if="loading" class="flex items-center gap-2 py-16 justify-center" style="color:#9a5614;">
      <Loader2 class="w-5 h-5 animate-spin" /> <span class="text-sm italic">Loading…</span>
    </div>

    <div v-else-if="!items.length" class="mt-8 rounded-2xl border-2 border-dashed p-10 text-center" style="border-color:#3b1f0d33;">
      <p class="text-sm font-bold" style="color:#3b1f0d;">No festivals.</p>
    </div>

    <div v-else class="mt-6 grid gap-3">
      <NuxtLink
        v-for="f in items"
        :key="f.slug"
        :to="`/admin/festivals/${f.slug}`"
        class="group flex items-center gap-3 rounded-2xl bg-white border p-4 transition-all hover:-translate-y-0.5"
        style="border-color:#16a34a33;"
      >
        <div class="flex-1 min-w-0">
          <h3 class="text-base font-bold leading-tight" style="color:#3b1f0d;">{{ f.name }}</h3>
          <p class="text-xs" style="color:#9a5614; font-family: system-ui, sans-serif;">{{ fmt(f.startDate) }} → {{ fmt(f.endDate) }} · {{ f.slug }}</p>
        </div>
        <ArrowRight class="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1" style="color:#16a34a;" />
      </NuxtLink>
    </div>
  </div>
</template>
