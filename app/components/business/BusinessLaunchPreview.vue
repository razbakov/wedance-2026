<script setup lang="ts">
/**
 * A launch result, shown the way it will read — a caption, a Maps listing, an
 * Instagram bio, a listing — so the organiser can approve it without a form.
 */
import { MapPin, Instagram } from 'lucide-vue-next'

const props = defineProps<{
  stepKey: string
  copy: { key: string; label: string; text: string }[]
  aside?: string | null
}>()
const text = (key: string) => props.copy.find(c => c.key === key)?.text?.trim() ?? ''
const filled = computed(() => props.copy.some(c => c.text.trim()))
const listing = computed(() => props.stepKey.startsWith('listing.'))
</script>

<template>
  <div>
    <p v-if="!filled" class="text-sm text-muted-foreground">Nothing to show yet. Answer the questions, or change something and write it in.</p>

    <!-- Brand -->
    <div v-else-if="stepKey === 'brand.why'" class="rounded-2xl bg-muted/40 p-4">
      <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">On a caption</p>
      <p class="mt-1 font-display text-xl font-bold">{{ text('presents') || '—' }}</p>
    </div>
    <div v-else-if="stepKey === 'brand.where'" class="rounded-2xl bg-muted/40 p-4">
      <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">Where and when</p>
      <p class="mt-1 font-display text-xl font-bold leading-snug">{{ text('line') || '—' }}</p>
    </div>
    <blockquote v-else-if="stepKey === 'brand.pitch'" class="border-l-4 border-primary pl-4 font-display text-2xl font-bold leading-snug">{{ text('oneLiner') }}</blockquote>

    <!-- Google -->
    <div v-else-if="stepKey === 'maps.name' || stepKey === 'maps.description' || stepKey === 'maps.basics'" class="rounded-2xl border p-4">
      <p class="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground"><MapPin class="size-3.5" aria-hidden="true" /> On Google</p>
      <p v-if="text('name')" class="mt-1 font-display text-xl font-bold">{{ text('name') }}</p>
      <p v-if="text('hours')" class="mt-1 text-sm">{{ text('hours') }}</p>
      <p v-if="text('description')" class="mt-2 whitespace-pre-line text-sm leading-relaxed">{{ text('description') }}</p>
      <p v-if="text('sign')" class="mt-3 whitespace-pre-line border-t pt-3 text-sm">{{ text('sign') }}</p>
    </div>
    <div v-else-if="stepKey === 'maps.weekly_post'" class="rounded-2xl border p-4">
      <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">This week’s post</p>
      <p class="mt-1 whitespace-pre-line text-sm leading-relaxed">{{ text('post') }}</p>
    </div>
    <div v-else-if="stepKey === 'maps.reviews'" class="rounded-2xl border border-dashed p-4 text-center">
      <p class="whitespace-pre-line text-sm font-bold">{{ text('card') }}</p>
    </div>

    <!-- Instagram -->
    <div v-else-if="stepKey === 'ig.handle'" class="rounded-2xl border p-4">
      <p class="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground"><Instagram class="size-3.5" aria-hidden="true" /> Handle</p>
      <p class="mt-1 font-display text-2xl font-bold">{{ text('handle') ? `@${text('handle')}` : '—' }}</p>
    </div>
    <div v-else-if="stepKey === 'ig.profile'" class="rounded-2xl border p-4">
      <p class="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground"><Instagram class="size-3.5" aria-hidden="true" /> Profile</p>
      <div class="mt-2 flex items-start gap-3">
        <div class="size-14 shrink-0 rounded-full bg-muted" aria-hidden="true" />
        <div class="min-w-0">
          <p class="font-bold">{{ text('name') || '—' }}</p>
          <p class="mt-1 whitespace-pre-line text-sm leading-relaxed">{{ text('bio') }}</p>
        </div>
      </div>
    </div>
    <pre v-else-if="stepKey === 'ig.habits'" class="whitespace-pre-line rounded-2xl bg-muted/40 p-4 font-sans text-sm leading-relaxed">{{ text('checklist') }}</pre>

    <!-- WeDance + listings -->
    <div v-else-if="stepKey === 'site.page'" class="rounded-2xl bg-muted/40 p-4">
      <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">Link for the bio</p>
      <p class="mt-1 break-all font-bold">{{ text('link') || '—' }}</p>
    </div>
    <div v-else-if="stepKey === 'wedance.series'" class="rounded-2xl border p-4">
      <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">On the city calendar</p>
      <p class="mt-1 font-display text-xl font-bold">{{ text('title') || '—' }}</p>
      <p class="mt-2 whitespace-pre-line text-sm leading-relaxed">{{ text('description') }}</p>
    </div>
    <div v-else-if="listing" class="rounded-2xl border p-4">
      <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">The listing</p>
      <p class="mt-1 whitespace-pre-line text-sm leading-relaxed">{{ text('text') }}</p>
    </div>
    <div v-else class="grid gap-3">
      <div v-for="c in copy" :key="c.key">
        <p class="text-xs font-bold uppercase tracking-wide text-muted-foreground">{{ c.label }}</p>
        <p class="mt-1 whitespace-pre-line text-sm leading-relaxed">{{ c.text || '—' }}</p>
      </div>
    </div>

    <p v-if="aside && filled" class="mt-3 text-xs text-muted-foreground">{{ aside }}</p>
  </div>
</template>
