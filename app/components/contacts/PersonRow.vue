<script setup lang="ts">
/**
 * One contact on the Contacts page (RAZ-949): who, how to reach them, where
 * they came from, whether the page may email them, and what they do on WeDance
 * around the page's events. Read-only; the Contacts page adds the actions.
 * Someone in the page's audience who isn't a contact (`isContact: false`, RAZ-963)
 * shows what they are — follower, went / going — and "Not a contact · no email";
 * there is no email or phone to show for them.
 */
import { Mail, Phone, StickyNote } from 'lucide-vue-next'
import { initialsOf } from '#shared/utils/initials'
import { contactSince } from '~/lib/contactFilters'
import { activityLine, cameToEvents, EMAIL_BLOCK_LABEL, type ContactActivity, type EmailBlock } from '#shared/utils/contactSegments'

const props = withDefaults(defineProps<{
  contact: {
    name: string | null
    email: string
    phone: string | null
    note: string | null
    sourceLabel: string
    emailBlock: EmailBlock | null
    status: string
    createdAt: string | Date | null
    source?: Record<string, string> | null
    isContact?: boolean
    account: { name: string | null, photo: string | null, username?: string | null, city?: string | null } | null
    activity: ContactActivity
  }
  /** Hide the source + date line (when the layout already shows it). */
  compact?: boolean
  /** Extra words after the source + date (locale, UTM, promo code). */
  detail?: string
  /** Hide the note (while the page edits it). */
  hideNote?: boolean
}>(), { compact: false, detail: '', hideNote: false })

const c = computed(() => props.contact)
const display = computed(() => c.value.name || c.value.account?.name || c.value.email || 'A dancer')
const isContact = computed(() => c.value.isContact !== false)
// Which of the page's people this is: contact, follower, went / going to its events.
const roles = computed(() => [
  isContact.value ? 'Contact' : '',
  c.value.activity.follows ? 'Follower' : '',
  cameToEvents(c.value.activity) ? 'Event-goer' : '',
].filter(Boolean))
const since = computed(() => contactSince(c.value.createdAt, c.value.source))
const line = computed(() => activityLine(c.value.activity))
const wa = (p: string) => `https://wa.me/${p.replace(/[^\d+]/g, '').replace(/^00/, '+').replace(/^\+/, '')}`
</script>

<template>
  <div class="flex min-w-0 gap-3" :class="c.status === 'unsubscribed' ? 'opacity-60' : ''">
    <Avatar class="size-10 shrink-0">
      <AvatarImage v-if="c.account?.photo" :src="c.account.photo" :alt="display" />
      <AvatarFallback class="text-xs font-bold">{{ initialsOf(display) }}</AvatarFallback>
    </Avatar>
    <div class="min-w-0 flex-1">
      <p class="flex flex-wrap items-center gap-x-2 gap-y-1 font-bold">
        <span class="truncate">{{ display }}</span>
        <span v-if="c.emailBlock" class="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{{ EMAIL_BLOCK_LABEL[c.emailBlock] }}</span>
        <span v-else class="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-wd-green-700">Can email</span>
        <span v-for="r in roles" :key="r" class="rounded-full border px-2 py-0.5 text-xs font-semibold text-muted-foreground" data-person-role>{{ r }}</span>
      </p>
      <p v-if="isContact" class="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a :href="`mailto:${c.email}`" class="inline-flex min-w-0 items-center gap-1 underline-offset-2 hover:underline"><Mail class="size-3.5 shrink-0" aria-hidden="true" /> <span class="truncate">{{ c.email }}</span></a>
        <a v-if="c.phone" :href="wa(c.phone)" target="_blank" rel="noopener" class="inline-flex items-center gap-1 underline-offset-2 hover:underline"><Phone class="size-3.5" aria-hidden="true" /> {{ c.phone }}</a>
      </p>
      <p v-if="c.account" class="mt-1 text-sm" :class="line ? 'font-semibold text-wd-red-800' : 'text-muted-foreground'">
        {{ line ? line[0]!.toUpperCase() + line.slice(1) : 'On WeDance — nothing with you yet' }}
      </p>
      <p v-if="!compact && isContact" class="mt-1 text-xs text-muted-foreground">{{ c.sourceLabel }}<template v-if="since"> · {{ since }}</template><template v-if="detail"> · {{ detail }}</template><template v-if="!c.account"> · no WeDance account</template></p>
      <p v-else-if="!compact" class="mt-1 text-xs text-muted-foreground">
        On WeDance<template v-if="c.account?.city"> · {{ c.account.city }}</template><template v-if="c.activity.followedAt"> · follows you since {{ since }}</template>
        · hasn’t shared an email with you
        <template v-if="c.account?.username"> · <NuxtLink :to="`/u/${c.account.username}`" class="underline underline-offset-2">Profile</NuxtLink></template>
      </p>
      <p v-if="c.note && !hideNote" class="mt-1 whitespace-pre-line text-sm"><StickyNote class="mr-1 inline size-3.5 text-muted-foreground" aria-hidden="true" />{{ c.note }}</p>
    </div>
  </div>
</template>
