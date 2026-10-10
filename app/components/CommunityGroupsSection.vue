<script setup lang="ts">
/**
 * Community groups (WhatsApp / Telegram / …) for a city — the cold-start
 * directory shown when WeDance has no events there yet. Client-side fetch.
 */
import { MessageCircle, ArrowUpRight, BadgeCheck, Flag } from 'lucide-vue-next'
import { WD } from '~/lib/brand'

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
  const confirmed = window.confirm(
    'Are you sure you want to report this group? ' +
    'If it receives multiple reports, it will be hidden from this listing.'
  )
  if (!confirmed) return

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
  <!-- Only render the entire section (including wrapper) if there are groups to display -->
  <section v-if="groups.length > 0" class="border-t" style="border-color:color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent); background:rgba(251, 245, 234, 0.5);">
    <div class="max-w-4xl mx-auto px-4 py-12" style="font-family:var(--wd-font-sans);">
      <div class="flex items-center gap-2">
        <MessageCircle class="w-5 h-5" style="color:var(--wd-green-600);" />
        <h3 class="text-2xl" style="font-family:var(--wd-font-display); color:var(--wd-brown-900);">Local groups</h3>
      </div>
      <p class="mt-1 text-sm" style="color:var(--wd-brown-700);">
        Community chats where the{{ cityName ? ` ${cityName}` : '' }} scene organises — WhatsApp, Telegram &amp; more. Join the locals.
      </p>

      <ul class="mt-4 grid gap-2 sm:grid-cols-2">
        <li v-for="g in groups" :key="g.id" class="relative">
          <div class="group relative">
            <a :href="g.inviteUrl" target="_blank" rel="noopener"
               class="flex items-center justify-between gap-3 rounded-xl border p-3 bg-white transition-all hover:-translate-y-0.5"
               style="border-color:color-mix(in srgb, var(--wd-green-600) 20%, transparent);">
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="font-bold text-sm truncate" style="color:var(--wd-brown-900);">{{ g.name }}</span>
                  <BadgeCheck v-if="g.verified" class="w-3.5 h-3.5 shrink-0" style="color:var(--wd-green-600);" />
                </div>
                <div class="text-[11px] mt-0.5" style="color:var(--wd-amber-600);">
                  {{ platformLabel[g.platform] || 'Group' }}<span v-if="g.styles?.length"> · {{ g.styles.join(', ') }}</span>
                </div>
              </div>
              <ArrowUpRight class="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style="color:var(--wd-green-600);" />
            </a>
            <button
              type="button"
              :disabled="reportingId === g.id"
              class="absolute top-2 right-2 p-1.5 rounded-lg transition-all opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
              style="background:rgba(220,38,38,0.1);"
              title="Report broken invite link or inactive group"
              @click.prevent="reportGroup(g.id)"
            >
              <Flag class="w-3.5 h-3.5" :style="{ color: reportingId === g.id ? '#999' : WD.red600 }" />
            </button>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
