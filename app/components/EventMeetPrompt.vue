<script setup lang="ts">
/**
 * After signing up to a night (RAZ-981): the moment a dancer gets into "Meet new
 * friends". Signing up is what puts them in the deck of everyone going out
 * nearby in the next two weeks (server/utils/myPlanFeeds.ts `discoverDeck`), so
 * this says so, asks for what's missing (a photo, a public profile) and leads
 * to the deck — the people there are going out too, and each card links to
 * their night. Shown under "You're in" in EventSignup. "Add a photo" opens the
 * dancer's own card (/dance-card, RAZ-1005) and comes back here.
 */
import { ArrowRight, Camera, Users } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'

const props = defineProps<{
  /** The night signed up to: the dance card starts with its dances. */
  eventId: string
  /** The dancer's answer: a lone leader / follower gets a line about finding a partner. */
  answer?: string | null
  surface: string
}>()

const route = useRoute()
const { photo, profilePublic } = useAuth()
const hasPhoto = computed(() => !!photo.value?.trim())
const isPublic = computed(() => profilePublic.value !== false)
const shown = computed(() => hasPhoto.value && isPublic.value)
/** The dance card, started from this night and how they signed up (RAZ-1005); Back returns here. */
const cardLink = computed(() => {
  const q = new URLSearchParams({ event: props.eventId, back: route.fullPath })
  if (props.answer) q.set('as', props.answer)
  return `/dance-card?${q}`
})
const lookingFor = computed(() => props.answer === 'needLeader' ? 'a leader' : props.answer === 'needFollower' ? 'a follower' : null)

function open() {
  useTrack().track('meet_friends_opened', { surface: props.surface, people: null })
}
</script>

<template>
  <div class="rounded-2xl border border-border bg-card px-4 py-3 space-y-2" data-meet-prompt>
    <p class="inline-flex items-center gap-1.5 font-bold text-foreground">
      <Users class="size-4" aria-hidden="true" /> Meet who’s going
    </p>
    <p v-if="shown" class="text-sm text-muted-foreground">
      Dancers going out near you now see you’re going to this night, in Meet new friends. Say yes to the ones you’d like to dance with —
      each of them is going out too, so you’ll know where to find them.
    </p>
    <p v-else-if="!hasPhoto" class="text-sm text-muted-foreground" data-meet-prompt-photo>
      Add a photo and dancers going out near you will see you’re going to this night — in Meet new friends and in Who’s coming.
      Without one, nobody can recognise you.
    </p>
    <p v-else class="text-sm text-muted-foreground" data-meet-prompt-private>
      Your profile is private, so nobody sees you’re going. Make it public and dancers going out near you can find you in Meet new friends.
    </p>
    <p v-if="lookingFor" class="text-sm text-muted-foreground">
      Looking for {{ lookingFor }}? The ones going are under Who’s coming below, and in the deck.
    </p>
    <div class="flex flex-wrap items-center gap-2">
      <Button as-child variant="cta" size="pill-sm">
        <NuxtLink to="/meet" data-meet-prompt-open @click="open">Meet who’s going <ArrowRight aria-hidden="true" /></NuxtLink>
      </Button>
      <Button v-if="!shown" as-child variant="outline" size="pill-sm">
        <NuxtLink :to="cardLink" data-meet-prompt-settings>
          <Camera v-if="!hasPhoto" aria-hidden="true" /> {{ hasPhoto ? 'Make my profile public' : 'Add a photo' }}
        </NuxtLink>
      </Button>
    </div>
  </div>
</template>
