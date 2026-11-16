<script setup lang="ts">
/**
 * "WeDance in ChatGPT" as a plan, not a link: a short example chat (ask where
 * to dance → an answer that adds it to your plan) and the button to add the
 * official app. Used at the top of My plan until the dancer has connected
 * ChatGPT (`card`) and as the opening of the signed-out My plan landing (`hero`).
 *
 * Fires `ai_app_cta_click` { app, surface }; the delegated listener also sends
 * `outbound_click` with kind `ai_app` (data-outbound-kind).
 */
import { ExternalLink, Sparkles, X } from 'lucide-vue-next'
import { CHATGPT_PLUGIN_URL } from '~/lib/ai-apps'

const props = withDefaults(defineProps<{
  surface: string
  variant?: 'card' | 'hero'
  city?: string | null
  style?: string | null
  dismissible?: boolean
  /** The hero's heading level: h1 unless something above it is the page's h1. */
  heading?: 'h1' | 'h2'
}>(), { variant: 'card', city: null, style: null, dismissible: false, heading: undefined })

const emit = defineEmits<{ dismiss: [] }>()

const where = computed(() => props.city || 'Munich')
const what = computed(() => (props.style || 'salsa').toLowerCase())
const question = computed(() => `Where can I dance ${what.value} in ${where.value} this weekend?`)
const answer = computed(() => `4 ${what.value} parties this weekend. Friday's has friends of yours going — want me to add it to your plan?`)

const onClick = () => useTrack().track('ai_app_cta_click', { app: 'chatgpt', surface: props.surface })
</script>

<template>
  <div
    class="relative rounded-2xl border bg-card overflow-hidden"
    :class="variant === 'hero' ? 'p-6 sm:p-10' : 'p-5 sm:p-6'"
    style="border-color:color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent); box-shadow: 0 1px 0 color-mix(in srgb, var(--wd-brown-900) 3.9%, transparent), 0 10px 28px rgba(59,31,18,0.06);"
    data-outbound-kind="ai_app"
    data-testid="chatgpt-plan-pitch"
  >
    <button
      v-if="dismissible"
      type="button"
      class="absolute top-3 right-3 p-1.5 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label="Hide for now"
      @click="emit('dismiss')"
    >
      <X class="w-4 h-4" aria-hidden="true" />
    </button>

    <div class="grid gap-6 items-center" :class="variant === 'hero' ? 'md:grid-cols-[1.1fr_1fr]' : 'sm:grid-cols-[1fr_1fr]'">
      <div :class="variant === 'hero' ? 'text-center md:text-left' : ''">
        <div class="inline-flex items-center gap-1.5 text-eyebrow uppercase tracking-[0.3em] font-bold text-primary">
          <Sparkles class="w-3.5 h-3.5" aria-hidden="true" /> WeDance in ChatGPT
        </div>
        <!-- As the hero of a landing it is the page's h1. -->
        <component
          :is="heading ?? (variant === 'hero' ? 'h1' : 'h2')"
          class="mt-2 leading-tight font-display text-foreground"
          :class="variant === 'hero' ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl'"
        >
          Ask where to dance. <em class="italic text-primary">Get your plan.</em>
        </component>
        <p class="mt-3 text-sm sm:text-base text-muted-foreground font-sans" :class="variant === 'hero' ? 'max-w-md mx-auto md:mx-0' : ''">
          Add WeDance to ChatGPT once. Then ask about parties, festivals and courses in plain words — what you pick lands on your plan here.
        </p>
        <div class="mt-5 flex flex-wrap items-center gap-3" :class="variant === 'hero' ? 'justify-center md:justify-start' : ''">
          <Button variant="cta" :size="variant === 'hero' ? 'lg' : 'default'" as-child>
            <a :href="CHATGPT_PLUGIN_URL" target="_blank" rel="noopener" @click="onClick">
              Add WeDance to ChatGPT <ExternalLink aria-hidden="true" />
            </a>
          </Button>
          <NuxtLink to="/docs/connect-ai" class="text-xs italic underline text-secondary font-display">How it works</NuxtLink>
        </div>
      </div>

      <!-- Example chat -->
      <div class="rounded-2xl p-4 space-y-3 font-sans" style="background:color-mix(in srgb, var(--wd-brown-900) 4%, transparent);" aria-label="Example chat">
        <div class="ml-auto max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm bg-wd-brown-900" style="color:white;">
          {{ question }}
        </div>
        <div class="max-w-[90%] rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm bg-white text-foreground border border-border">
          <div class="text-eyebrow uppercase tracking-widest font-bold text-primary mb-1">WeDance</div>
          {{ answer }}
        </div>
      </div>
    </div>
  </div>
</template>
