<script setup lang="ts">
import { Check, Copy } from 'lucide-vue-next'

/** Read-only code block with a copy button. */
const props = defineProps<{ code: string, lang?: string }>()
const copied = ref(false)

async function copy() {
  try {
    await navigator.clipboard.writeText(props.code.trim())
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  }
  catch { /* clipboard blocked — the code is still selectable */ }
}
</script>

<template>
  <div class="relative group rounded-xl bg-wd-brown-950 text-wd-cream">
    <div class="flex items-center justify-between px-4 pt-2.5 text-[10px] uppercase tracking-widest text-wd-sand-400 font-sans">
      <span>{{ lang || 'vue' }}</span>
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-white/10 transition-colors"
        :aria-label="copied ? 'Copied' : 'Copy code'"
        @click="copy"
      >
        <Check v-if="copied" class="w-3.5 h-3.5" />
        <Copy v-else class="w-3.5 h-3.5" />
        {{ copied ? 'Copied' : 'Copy' }}
      </button>
    </div>
    <pre tabindex="0" :aria-label="`${lang || 'vue'} code example`" class="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring px-4 pb-4 pt-2 text-[13px] leading-relaxed font-mono"><code>{{ code.trim() }}</code></pre>
  </div>
</template>
