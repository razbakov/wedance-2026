<script setup lang="ts">
/**
 * Community groups (WhatsApp / Telegram / …) for a city — the cold-start
 * directory shown when WeDance has no events there yet. Client-side fetch.
 */
import { MessageCircle, ArrowUpRight, BadgeCheck, Flag } from 'lucide-vue-next'

const props = defineProps<{ citySlug: string; cityName?: string }>()
const { $trpc } = useNuxtApp()

const groups = ref<any[]>([])
const loading = ref(true)
const reportingId = ref<string | null>(null)

async function load() {
  loading.value = true
  try { groups.value = await $trpc.communityGroup.listByCity.query({ citySlug: props.citySlug }) }
  catch { groups.value = [] } finally { loading.value = false }
}

async function reportGroup(groupId: string) {
  reportingId.value = groupId
  try {
    const result = await $trpc.communityGroup.report.mutate({ groupId })
    // Remove from display if hidden
    if (result.hidden) {
      groups.value = groups.value.filter(g => g.id !== groupId)
    }
  } catch (error) {
    console.error('Failed to report group:', error)
  } finally {
    reportingId.value = null
  }
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
      Community chats where the{{ cityName ? ` ${cityName}` : '' }} scene organises — WhatsApp, Telegram &amp; more. Join the locals.
    </p>

    <div v-if="loading" class="mt-4 text-sm" style="color:#9a5614;">Loading…</div>
    <ul v-else class="mt-4 grid gap-2 sm:grid-cols-2">
      <li v-for="g in groups" :key="g.id" class="relative">
        <div class="group relative">
          <a :href="g.inviteUrl" target="_blank" rel="noopener"
             class="flex items-center justify-between gap-3 rounded-xl border p-3 bg-white transition-all hover:-translate-y-0.5"
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
          <button
            type="button"
            :disabled="reportingId === g.id"
            class="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 transition-all group-hover:opacity-100"
            style="background:rgba(220,38,38,0.1);"
            title="Report broken invite link or inactive group"
            @click.prevent="reportGroup(g.id)"
          >
            <Flag class="w-3.5 h-3.5" :style="{ color: reportingId === g.id ? '#999' : '#dc2626' }" />
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>
