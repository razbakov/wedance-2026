<script setup lang="ts">
/**
 * Back on an event or festival page (RAZ-1020). Returns to the in-app page
 * the dancer came from; a direct open goes to the event's city. Tab changes
 * (`?tab=`) stay on this page and are skipped.
 */
import { ArrowLeft } from 'lucide-vue-next'
import { eventBackTarget, type EventBack, type EventBackMemory, type EventCity } from '~/lib/eventBack'

const props = defineProps<{ city?: EventCity | null }>()

const route = useRoute()
const router = useRouter()
const MEMORY_KEY = 'wedance-event-back'

function readMemory(): EventBackMemory | null {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(MEMORY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<EventBackMemory> | null
    if (!parsed || typeof parsed.origin !== 'string' || typeof parsed.path !== 'string' || typeof parsed.position !== 'number') return null
    return { origin: parsed.origin, path: parsed.path, position: parsed.position }
  } catch {
    return null
  }
}

function writeMemory(memory: EventBackMemory | null) {
  if (!import.meta.client) return
  try {
    if (!memory) sessionStorage.removeItem(MEMORY_KEY)
    else sessionStorage.setItem(MEMORY_KEY, JSON.stringify(memory))
  } catch { /* private mode */ }
}

function fallback(): EventBack {
  return eventBackTarget({ historyBack: null, eventPath: route.path, city: props.city ?? null }).back
}

// The server (and the first client render) don't read history, so hydration
// matches. onMounted then points the link at where this visit came from.
const back = ref<EventBack>(fallback())

function resolve() {
  const state = window.history.state as { back?: unknown; position?: unknown } | null
  const result = eventBackTarget({
    historyBack: typeof state?.back === 'string' ? state.back : null,
    position: typeof state?.position === 'number' ? state.position : null,
    eventPath: route.path,
    city: props.city ?? null,
  }, readMemory())
  back.value = result.back
  writeMemory(result.memory)
}

onMounted(resolve)
watch(() => [route.fullPath, props.city?.slug, props.city?.name] as const, () => {
  if (import.meta.client) resolve()
})

function onClick(e: MouseEvent) {
  if (back.value.delta <= 0) return
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
  e.preventDefault()
  router.go(-back.value.delta)
}
</script>

<template>
  <NuxtLink
    :to="back.href"
    class="inline-flex items-center gap-1.5 max-w-full text-sm font-bold text-primary hover:underline font-sans"
    data-testid="event-back"
    :aria-label="back.label === 'Back' ? 'Back' : `Back to ${back.label}`"
    @click="onClick"
  >
    <ArrowLeft class="size-4 shrink-0" aria-hidden="true" />
    <span class="truncate">{{ back.label }}</span>
  </NuxtLink>
</template>
