<script setup lang="ts">
/**
 * TeacherProfile — inline artist preview shown on the festival page when
 * an artist is tapped in the Lineup. Filters the schedule (via the page's
 * selectedTeacherId) and previews bio + video + socials here, with a link
 * out to the artist's full /artists/[id] profile. V3 tropical style.
 */
import type { Teacher } from '~/types/festival'
import { Instagram, Youtube, Globe, ArrowRight, X } from 'lucide-vue-next'

const props = defineProps<{
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

// Unified profile handle: /@<slug-of-name>. Resolves to a real venue/pro page
// when one exists (e.g. the Pinakothek showcase), otherwise a graceful
// "not on WeDance yet — claim it" stub. No more /artists/<id> 404s.
const profileHref = computed(() => {
  const slug = String(props.teacher.name || '')
    .toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  return slug ? `/@${slug}` : null
})

function toEmbedUrl(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&/?]+)/)
  return match ? `https://www.youtube.com/embed/${match[1]}` : url
}
</script>

<template>
  <div class="rounded-2xl bg-white p-5 border" style="border-color:#dc262633; box-shadow: 0 1px 0 #dc262622, 0 8px 22px rgba(59,31,18,0.05);">
    <div class="flex items-start gap-4">
      <img :src="teacher.photo" :alt="teacher.name" class="w-20 h-20 rounded-full object-cover shrink-0 shadow-sm">
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h3 class="text-xl font-black leading-tight" style="font-family:'Playfair Display', serif; color:#3b1f0d;">
              {{ teacher.name }}
            </h3>
            <p v-if="teacher.styles.length" class="mt-1 flex flex-wrap gap-1.5">
              <span
                v-for="(s, i) in teacher.styles"
                :key="s"
                class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                :style="{
                  background: ['#dc2626', '#0891b2', '#16a34a', '#a855f7', '#f59e0b'][i % 5] + '18',
                  color: ['#dc2626', '#0891b2', '#16a34a', '#a855f7', '#f59e0b'][i % 5],
                }"
              >{{ s }}</span>
            </p>
          </div>
          <button
            type="button"
            class="shrink-0 p-1 -m-1 rounded-full hover:bg-black/[0.04] transition-colors"
            style="color:#9a5614;"
            aria-label="Close preview"
            @click="$emit('close')"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <p v-if="teacher.bio" class="mt-2 text-sm leading-relaxed" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
          {{ teacher.bio }}
        </p>

        <div class="mt-3 flex items-center gap-4">
          <div v-if="teacher.socialLinks?.length" class="flex items-center gap-3">
            <a
              v-for="link in teacher.socialLinks"
              :key="link.platform"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="transition-colors"
              style="color:#9a5614;"
              :title="link.platform"
            >
              <component :is="platformIcon[link.platform]" v-if="platformIcon[link.platform]" class="w-4 h-4" />
              <span v-else class="text-xs italic capitalize">{{ link.platform }}</span>
            </a>
          </div>
          <NuxtLink
            v-if="profileHref"
            :to="profileHref"
            class="ml-auto inline-flex items-center gap-1 text-xs font-bold italic hover:underline"
            style="color:#dc2626; font-family:'Playfair Display', serif;"
          >
            Full profile <ArrowRight class="w-3.5 h-3.5" />
          </NuxtLink>
        </div>
      </div>
    </div>

    <div v-if="teacher.videoUrl" class="mt-4 aspect-video rounded-xl overflow-hidden" style="background:#3b1f0d0a;">
      <iframe
        :src="toEmbedUrl(teacher.videoUrl)"
        class="w-full h-full"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      />
    </div>
  </div>
</template>
