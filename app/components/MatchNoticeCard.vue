<script setup lang="ts">
/**
 * The match on /meet: the other dancer the way the deck shows them (photo,
 * name, city, role, dances) and the night the way an event card shows it
 * (picture, title, date and time, venue, how many are going). The button
 * opens the meetup.
 */
import { Calendar, MapPin, Users } from 'lucide-vue-next'
import { sizedImage, IMG } from '#shared/utils/image'
import { roleLabel, type Notice } from '#shared/utils/notices'

const props = defineProps<{ notice: Notice }>()
const emit = defineEmits<{ open: [] }>()
const role = computed(() => roleLabel(props.notice.person.role))
</script>

<template>
  <article
    class="overflow-hidden rounded-3xl border bg-card text-left shadow-wd-card"
    style="border-color: color-mix(in srgb, var(--wd-brown-900) 13.3%, transparent);"
    data-testid="meet-match-card"
  >
    <img
      v-if="notice.photo"
      :src="sizedImage(notice.photo, IMG.card)"
      :alt="notice.name"
      class="h-64 w-full object-cover"
      data-testid="meet-match-photo"
    >
    <div class="p-5">
      <p class="text-xs font-bold uppercase tracking-widest text-wd-green-700">It’s a match</p>
      <div class="mt-1 flex items-baseline justify-between gap-3">
        <h2 class="font-display text-2xl font-black text-foreground" data-testid="meet-match-name">{{ notice.name }}</h2>
        <p v-if="notice.person.city" class="font-display text-xs italic text-secondary">{{ notice.person.city }}</p>
      </div>
      <p v-if="role" class="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground" data-testid="meet-match-role">{{ role }}</p>
      <div v-if="notice.person.styles.length" class="mt-3 flex flex-wrap gap-1" data-testid="meet-match-styles">
        <span
          v-for="st in notice.person.styles"
          :key="st"
          class="text-eyebrow font-bold uppercase tracking-widest px-2 py-0.5 rounded-full text-muted-foreground"
          style="background: color-mix(in srgb, var(--wd-brown-900) 3.9%, transparent);"
        >{{ st }}</span>
      </div>
    </div>

    <NuxtLink
      v-if="notice.event"
      :to="notice.href"
      class="block border-t border-border"
      data-testid="meet-match-event"
      @click="emit('open')"
    >
      <img
        v-if="notice.event.cover"
        :src="sizedImage(notice.event.cover, IMG.card)"
        alt=""
        class="h-36 w-full object-cover"
        data-testid="meet-match-event-image"
      >
      <div class="flex items-start gap-3 p-4">
        <div
          v-if="!notice.event.cover"
          class="grid size-14 shrink-0 place-items-center rounded-xl bg-primary/10 font-display text-lg font-bold text-primary"
          aria-hidden="true"
        >{{ notice.event.name.slice(0, 1) }}</div>
        <div class="min-w-0 flex-1">
          <p class="font-bold text-foreground">{{ notice.event.name }}</p>
          <p class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar class="size-3 shrink-0" aria-hidden="true" /> {{ notice.event.whenLabel }}
          </p>
          <p v-if="notice.event.venue" class="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin class="size-3 shrink-0" aria-hidden="true" /> {{ notice.event.venue }}
          </p>
          <p class="mt-1 flex items-center gap-1 text-xs font-bold text-foreground" data-testid="meet-match-going">
            <Users class="size-3" aria-hidden="true" /> {{ notice.event.going }} going
          </p>
        </div>
      </div>
    </NuxtLink>

    <div class="border-t border-border p-5">
      <p class="text-sm text-muted-foreground font-sans">{{ notice.body }}</p>
      <Button as-child variant="cta" size="lg" class="mt-4 w-full">
        <NuxtLink :to="notice.href" data-testid="meet-match-action" @click="emit('open')">{{ notice.action }}</NuxtLink>
      </Button>
    </div>
  </article>
</template>
