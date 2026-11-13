<script setup lang="ts">
/**
 * "Get this every week": the city's own WeDance channels (city channels, migration 0066) —
 * the city page's Instagram and its official Telegram / WhatsApp channels, where the weekly
 * schedule is posted. Shown under the city's weekly calendar; hidden when the city has none.
 * Outbound clicks are tracked by plugins/06.outbound-click (object_type city_channel).
 */
import { Instagram, Send, MessageCircle, ArrowUpRight } from 'lucide-vue-next'

const props = defineProps<{ citySlug: string; cityName?: string }>()
const { $trpc } = useNuxtApp()

type Official = Awaited<ReturnType<typeof $trpc.cityChannels.official.query>>
const data = ref<Official>(null)

onMounted(async () => {
  try { data.value = await $trpc.cityChannels.official.query({ citySlug: props.citySlug }) }
  catch { data.value = null }
})

const icon = (platform: string) => (platform === 'instagram' ? Instagram : platform === 'telegram' ? Send : MessageCircle)
const label: Record<string, string> = { instagram: 'Instagram', telegram: 'Telegram', whatsapp: 'WhatsApp', facebook: 'Facebook', other: 'Join' }
</script>

<template>
  <section v-if="data?.channels.length" class="max-w-4xl mx-auto px-4 pb-12" data-testid="city-official-channels">
    <div class="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
      <div class="text-xs uppercase tracking-[0.3em] text-secondary">Every week</div>
      <h2 class="mt-2 text-xl leading-tight font-display text-foreground">
        Get {{ cityName ? `${cityName}’s` : 'the' }} dance week <em class="italic text-primary">in your feed.</em>
      </h2>
      <p class="mt-1 text-sm text-muted-foreground">
        {{ data.page?.name ?? 'WeDance' }} posts the parties, socials and workshops every week. Follow along where you already are.
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <a
          v-for="c in data.channels"
          :key="c.id"
          :href="c.inviteUrl"
          target="_blank"
          rel="noopener"
          data-object-type="city_channel"
          :data-object-id="citySlug"
          :data-city="citySlug"
          class="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-bold text-foreground transition-all hover:-translate-y-0.5 border-wd-brown-900/[12.2%]"
          :title="c.description || undefined"
        >
          <component :is="icon(c.platform)" class="size-4 text-primary" aria-hidden="true" />
          <span>{{ label[c.platform] ?? 'Join' }}</span>
          <span class="font-normal text-muted-foreground truncate max-w-[12rem]">{{ c.name }}</span>
          <ArrowUpRight class="size-3.5 text-secondary" aria-hidden="true" />
        </a>
      </div>
    </div>
  </section>
</template>
