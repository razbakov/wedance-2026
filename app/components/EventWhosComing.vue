<script setup lang="ts">
/**
 * Who's coming, under the hero of a class or event (RAZ-995) — fed by the sign-up's poll (EventSignup emits
 * it). As rsvp.poll decides: a signed-in viewer sees faces and first names (confirmed answers, public
 * profiles); everyone else sees the counts and "Sign in". A confirmed "Alone, I follow" sees the leaders
 * looking for a follower (and back) with a wave. The breakdown lives only here, not next to the button.
 */
import { Hand, Users } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'
import { rsvpOptions } from '#shared/utils/rsvp'
import { initialsOf } from '#shared/utils/initials'
import { sizedImage, IMG } from '#shared/utils/image'

type Poll = Awaited<ReturnType<ReturnType<typeof useNuxtApp>['$trpc']['rsvp']['poll']['query']>>
const props = defineProps<{ poll: Poll }>()

const { $trpc } = useNuxtApp()
const { isSignedIn } = useAuth()
const NuxtLink = resolveComponent('NuxtLink')

const options = computed(() => rsvpOptions(props.poll.partner).filter(o => o.id !== 'next'))
const breakdown = computed(() => {
  const c = props.poll.counts as Record<string, number>
  const n = (k: string) => c[k] ?? 0
  return props.poll.partner
    ? [
        n('needFollower') && `${n('needFollower')} ${n('needFollower') === 1 ? 'leader looks' : 'leaders look'} for a follower`,
        n('needLeader') && `${n('needLeader')} ${n('needLeader') === 1 ? 'follower looks' : 'followers look'} for a leader`,
        n('partner') && `${n('partner')} ${n('partner') === 1 ? 'couple' : 'couples'}`,
      ].filter(Boolean).join(' · ')
    : [n('yes') && `${n('yes')} on their own`, n('partner') && `${n('partner')} with a friend`].filter(Boolean).join(' · ')
})
const voters = computed(() => props.poll.voters ?? [])
const shown = ref(8)
// Everyone the faces don't show. A couple is one face and two people: the partner isn't "more".
const more = computed(() => Math.max(0, props.poll.coming - voters.value.length - voters.value.filter(v => v.answer === 'partner').length))
const label = (id: string) => options.value.find(o => o.id === id)?.short ?? ''

// Pairing: a confirmed "I need a leader" ↔ "I need a follower".
const pairTitle = computed(() => props.poll.mine?.answer === 'needLeader' ? 'Leaders looking for a follower' : 'Followers looking for a leader')
const pairing = computed(() => !!props.poll.mine?.confirmed && (props.poll.mine.answer === 'needLeader' || props.poll.mine.answer === 'needFollower'))
const waving = ref<string | null>(null)
async function wave(dancerId: string) {
  waving.value = dancerId
  try {
    await $trpc.wave.send.mutate({ festivalSlug: props.poll.eventId, targetDancerId: dancerId })
    useTrack().track('wave_sent', { festival: props.poll.eventId, surface: 'rsvp_pairing' })
    const m = props.poll.matches.find(x => x.dancerId === dancerId)
    if (m) m.waved = true
  } catch { /* stays un-waved */ } finally { waving.value = null }
}
const showSignIn = ref(false)
</script>

<template>
  <section v-if="poll.coming || poll.mine" class="font-sans" aria-labelledby="whos-coming-title" data-whos-coming>
    <h2 id="whos-coming-title" class="font-display text-2xl font-black text-foreground">
      Who’s coming <span class="font-hand text-secondary text-lg">— {{ poll.coming.toLocaleString('en') }}</span>
    </h2>
    <p v-if="breakdown" class="mt-1 text-sm text-muted-foreground">{{ breakdown }}</p>

    <!-- Signed in: faces and first names (confirmed, public profiles) -->
    <template v-if="isSignedIn && voters.length">
      <ul class="mt-3 flex flex-wrap gap-x-5 gap-y-3" data-whos-coming-faces>
        <li v-for="v in voters.slice(0, shown)" :key="v.dancerId">
          <component :is="v.username && !v.me ? NuxtLink : 'span'" :to="v.username && !v.me ? `/u/${v.username}` : undefined" class="flex items-center gap-2 text-sm font-bold text-foreground" :class="v.username && !v.me ? 'hover:underline' : ''">
            <Avatar class="size-9">
              <AvatarImage v-if="v.photo" :src="sizedImage(v.photo, IMG.avatar)" :alt="v.name" />
              <AvatarFallback>{{ initialsOf(v.name) }}</AvatarFallback>
            </Avatar>
            <span>{{ v.me ? 'You' : v.name }} <span class="block text-xs font-normal text-muted-foreground">{{ label(v.answer) }}</span></span>
          </component>
        </li>
      </ul>
      <div class="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <Button v-if="voters.length > shown" type="button" variant="link" size="sm" class="h-auto p-0" @click="shown = voters.length">See all {{ voters.length }}</Button>
        <span v-if="more" class="text-muted-foreground">+{{ more }} more</span>
      </div>
    </template>

    <!-- Signed out: counts only -->
    <div v-else-if="!isSignedIn" class="mt-3 flex flex-wrap items-center gap-3" data-whos-coming-anon>
      <span class="flex -space-x-2" aria-hidden="true">
        <span v-for="n in Math.min(poll.coming, 5)" :key="n" class="size-9 rounded-full bg-muted ring-2 ring-background grid place-items-center"><Users class="size-4 text-muted-foreground" /></span>
      </span>
      <p class="text-sm">
        <span class="text-muted-foreground">Sign up to see who they are</span> ·
        <Button type="button" variant="link" size="sm" class="h-auto p-0" @click="showSignIn = true">Sign in</Button>
      </p>
      <SignUpModal v-model:open="showSignIn" action="signin" />
    </div>

    <!-- Pairing -->
    <div v-if="pairing" class="mt-4 rounded-2xl border border-border bg-card p-4" data-whos-coming-pairing>
      <p class="text-eyebrow font-black uppercase tracking-widest text-secondary mb-2">{{ pairTitle }}</p>
      <ul v-if="poll.matches.length" class="space-y-2">
        <li v-for="m in poll.matches" :key="m.dancerId" class="flex items-center gap-3">
          <Avatar class="size-9">
            <AvatarImage v-if="m.photo" :src="sizedImage(m.photo, IMG.avatar)" :alt="m.name" />
            <AvatarFallback>{{ initialsOf(m.name) }}</AvatarFallback>
          </Avatar>
          <span class="text-sm font-bold text-foreground">{{ m.name }}</span>
          <Button type="button" :variant="m.waved ? 'pill' : 'outline-pill'" size="pill-sm" class="ml-auto" :disabled="m.waved" :loading="waving === m.dancerId" @click="wave(m.dancerId)">
            <Hand aria-hidden="true" /> {{ m.waved ? 'Waved' : 'Wave' }}
          </Button>
        </li>
      </ul>
      <p v-else class="text-sm text-muted-foreground">Nobody to pair with yet. They show up here when they sign up.</p>
    </div>
  </section>
</template>
