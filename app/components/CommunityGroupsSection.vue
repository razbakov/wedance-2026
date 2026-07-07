<script setup lang="ts">
/**
 * Community groups (WhatsApp / Telegram / …) for a city — the cold-start
 * directory shown when WeDance has no events there yet. Client-side fetch.
 */
import { MessageCircle, ArrowUpRight, BadgeCheck } from 'lucide-vue-next'

const props = defineProps<{ citySlug: string; cityName?: string }>()
const { $trpc } = useNuxtApp()

const groups = ref<any[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try { groups.value = await $trpc.communityGroup.listByCity.query({ citySlug: props.citySlug }) }
  catch { groups.value = [] } finally { loading.value = false }
}
onMounted(load)

const platformLabel: Record<string, string> = {
  whatsapp: 'WhatsApp', telegram: 'Telegram', facebook: 'Facebook', other: 'Group',
}
</script>

<template>
  <section v-if="loading || groups.length" class="mt-10" style="font-family: system-ui, sans-serif;">
    <div class="flex items-center gap-2">
      <MessageCircle class="w-5 h-5" style="color:#16a34a;" />
      <h3 class="text-2xl" style="font-family:'Playfair Display', serif; color:#3b1f0d;">Local groups</h3>
    </div>
    <p class="mt-1 text-sm" style="color:#5b3a1d;">
      No WeDance events here yet — but the scene is alive. Join the locals{{ cityName ? ` in ${cityName}` : '' }}.
    </p>

    <div v-if="loading" class="mt-4 text-sm" style="color:#9a5614;">Loading…</div>
    <ul v-else class="mt-4 grid gap-2 sm:grid-cols-2">
      <li v-for="g in groups" :key="g.id">
        <a :href="g.inviteUrl" target="_blank" rel="noopener"
           class="group flex items-center justify-between gap-3 rounded-xl border p-3 bg-white transition-all hover:-translate-y-0.5"
           style="border-color:#16a34a33;">
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-sm truncate" style="color:#3b1f0d;">{{ g.name }}</span>
              <BadgeCheck v-if="g.verified" class="w-3.5 h-3.5 shrink-0" style="color:#16a34a;" />
            </div>
            <div class="text-[11px] mt-0.5" style="color:#9a5614;">
              {{ platformLabel[g.platform] || 'Group' }}<span v-if="g.styles?.length"> · {{ g.styles.join(', ') }}</span>
            </div>
          </div>
          <ArrowUpRight class="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style="color:#16a34a;" />
        </a>
      </li>
    </ul>
  </section>
</template>
