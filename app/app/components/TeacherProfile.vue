<script setup lang="ts">
import type { Teacher } from '~/types/festival'
import { Instagram, Youtube, Globe } from 'lucide-vue-next'

defineProps<{
  teacher: Teacher
}>()

defineEmits<{
  close: []
}>()

const platformIcon: Record<string, any> = {
  instagram: Instagram,
  youtube: Youtube,
  website: Globe,
}

function toEmbedUrl(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)
  if (match) return `https://www.youtube.com/embed/${match[1]}`
  return url
}
</script>

<template>
  <div class="rounded-lg border bg-card p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
    <div class="flex items-start gap-4">
      <div class="w-20 h-20 rounded-full overflow-hidden shrink-0">
        <img :src="teacher.photo" :alt="teacher.name" class="w-full h-full object-cover" />
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <div>
            <h3 class="font-semibold text-base">{{ teacher.name }}</h3>
            <p class="text-xs text-muted-foreground">{{ teacher.styles.join(' · ') }}</p>
          </div>
          <button
            class="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1 -m-1"
            @click="$emit('close')"
          >
            ✕
          </button>
        </div>
        <p class="text-sm text-muted-foreground mt-2 leading-relaxed">{{ teacher.bio }}</p>
        <div v-if="teacher.socialLinks?.length" class="flex gap-3 mt-2">
          <a
            v-for="link in teacher.socialLinks"
            :key="link.platform"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-muted-foreground hover:text-foreground transition-colors"
            :title="link.platform"
          >
            <component
              :is="platformIcon[link.platform]"
              v-if="platformIcon[link.platform]"
              class="w-4 h-4"
            />
            <svg v-else-if="link.platform === 'tiktok'" class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78 2.92 2.92 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.57 6.33 6.33 0 0 0 9.37 22a6.33 6.33 0 0 0 6.37-6.23V9.12a8.16 8.16 0 0 0 3.85.96V6.69Z" />
            </svg>
          </a>
        </div>
      </div>
    </div>

    <div v-if="teacher.videoUrl" class="aspect-video rounded-md overflow-hidden bg-muted">
      <iframe
        :src="toEmbedUrl(teacher.videoUrl!)"
        class="w-full h-full"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      />
    </div>
  </div>
</template>
