<script setup lang="ts">
/**
 * Where to send a link: the profile's ways to be reached (shared/utils/contacts),
 * each opening in a new tab — copy the message first, then paste it there.
 *
 *   <BusinessContactLinks :contacts="link.contacts" :managed="link.managed" />
 */
import type { PropType } from 'vue'
import { Instagram, Facebook, Send, MessageCircle, Globe, MapPin, Search, ExternalLink } from 'lucide-vue-next'
import type { Contact } from '#shared/utils/contacts'

defineProps({
  contacts: { type: Array as PropType<Contact[]>, required: true },
  /** Someone runs the page here: it's in their Business inbox too. */
  managed: { type: Boolean, default: false },
})
const ICON = { instagram: Instagram, facebook: Facebook, telegram: Send, whatsapp: MessageCircle, website: Globe, maps: MapPin, search: Search } as const
</script>

<template>
  <div>
    <p class="text-sm font-bold">How to reach them</p>
    <p class="text-xs text-muted-foreground">
      <template v-if="contacts[0]?.kind === 'search'">We don’t have their contact yet: find them, then paste the message.</template>
      <template v-else>Copy the message, then paste it there.</template>
      <template v-if="managed"> They run their page on WeDance, so it’s in their Business inbox too.</template>
    </p>
    <ul class="mt-2 grid gap-1.5">
      <li v-for="c in contacts" :key="c.url">
        <a :href="c.url" target="_blank" rel="noopener" class="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:bg-muted">
          <component :is="ICON[c.kind]" class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span class="min-w-0 flex-1 truncate">{{ c.label }}</span>
          <ExternalLink class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </a>
      </li>
    </ul>
  </div>
</template>
