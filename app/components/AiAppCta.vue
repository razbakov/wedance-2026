<script setup lang="ts">
/**
 * "Use WeDance in ChatGPT" — the one nudge toward the official ChatGPT app,
 * placed where a chat does the job faster than the form (organisers setting up
 * an event from their announcement). Always an alternative next to the web
 * flow, never in place of it.
 *
 * Fires `ai_app_cta_click` { app, surface }; the delegated listener also sends
 * `outbound_click` with kind `ai_app`.
 *
 * variant: `card` (title + text + button), `inline` (a sentence with a link).
 */
import { MessageCircle, ExternalLink } from 'lucide-vue-next'
import { CHATGPT_PLUGIN_URL } from '~/lib/ai-apps'

const props = withDefaults(defineProps<{
  surface: string
  variant?: 'card' | 'inline'
  title?: string
  label?: string
}>(), { variant: 'card', title: '', label: 'Open in ChatGPT' })

const onClick = () => useTrack().track('ai_app_cta_click', { app: 'chatgpt', surface: props.surface })
</script>

<template>
  <div
    v-if="variant === 'card'"
    class="rounded-2xl border bg-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center"
    data-outbound-kind="ai_app"
    data-testid="ai-app-cta"
  >
    <MessageCircle class="hidden sm:block size-6 shrink-0 text-secondary" aria-hidden="true" />
    <div class="flex-1 min-w-0">
      <p v-if="title" class="text-sm font-bold text-foreground">{{ title }}</p>
      <p class="text-sm text-muted-foreground"><slot /></p>
    </div>
    <Button variant="outline-pill" size="pill-sm" as-child class="self-start sm:self-center shrink-0">
      <a :href="CHATGPT_PLUGIN_URL" target="_blank" rel="noopener" @click="onClick">
        {{ label }} <ExternalLink aria-hidden="true" />
      </a>
    </Button>
  </div>
  <p v-else class="text-sm text-muted-foreground" data-outbound-kind="ai_app" data-testid="ai-app-cta">
    <slot />
    <a :href="CHATGPT_PLUGIN_URL" target="_blank" rel="noopener" class="font-bold text-wd-red-800 hover:underline" @click="onClick">{{ label }}</a>
  </p>
</template>
