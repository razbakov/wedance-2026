<script setup lang="ts">
/**
 * One contact on the Contacts page (RAZ-949): who, how to reach them, where
 * they came from, whether the page may email them, and what they do on WeDance
 * around the page's events. Read-only; actions live with the chosen layout.
 */
import { Mail, Phone, CalendarCheck, Heart, Repeat } from 'lucide-vue-next'
import { initialsOf } from '#shared/utils/initials'
import { activityLine, EMAIL_BLOCK_LABEL, type ContactActivity, type EmailBlock } from '#shared/utils/contactSegments'

const props = withDefaults(defineProps<{
  contact: {
    name: string | null
    email: string
    phone: string | null
    note: string | null
    sourceLabel: string
    emailBlock: EmailBlock | null
    status: string
    createdAt: string | Date
    account: { name: string | null, photo: string | null } | null
    activity: ContactActivity
  }
  /** Hide the source + date line (when the layout already shows it). */
  compact?: boolean
  /** Activity as icons with words (cards) instead of one line. */
  stacked?: boolean
}>(), { compact: false, stacked: false })

const c = computed(() => props.contact)
const display = computed(() => c.value.name || c.value.account?.name || c.value.email)
const line = computed(() => activityLine(c.value.activity))
const wa = (p: string) => `https://wa.me/${p.replace(/[^\d+]/g, '').replace(/^00/, '+').replace(/^\+/, '')}`
const when = (d: string | Date) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const nextDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
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
      </p>
      <p class="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a :href="`mailto:${c.email}`" class="inline-flex min-w-0 items-center gap-1 underline-offset-2 hover:underline"><Mail class="size-3.5 shrink-0" aria-hidden="true" /> <span class="truncate">{{ c.email }}</span></a>
        <a v-if="c.phone" :href="wa(c.phone)" target="_blank" rel="noopener" class="inline-flex items-center gap-1 underline-offset-2 hover:underline"><Phone class="size-3.5" aria-hidden="true" /> {{ c.phone }}</a>
      </p>
      <template v-if="stacked">
        <ul v-if="c.account" class="mt-2 grid gap-1 text-sm">
          <li v-if="c.activity.upcoming.length" class="flex items-center gap-1.5 font-semibold text-wd-red-800"><CalendarCheck class="size-4" aria-hidden="true" /> Going {{ nextDate(c.activity.upcoming[0]!.startDate) }}</li>
          <li v-if="c.activity.wentTo" class="flex items-center gap-1.5"><Repeat class="size-4 text-muted-foreground" aria-hidden="true" /> Came to {{ c.activity.wentTo }} of your events</li>
          <li v-if="c.activity.follows" class="flex items-center gap-1.5"><Heart class="size-4 text-muted-foreground" aria-hidden="true" /> Follows you</li>
          <li v-if="!line" class="text-muted-foreground">On WeDance, nothing with you yet</li>
        </ul>
        <p v-else class="mt-2 text-sm text-muted-foreground">No WeDance account</p>
      </template>
      <p v-else-if="c.account" class="mt-1 text-sm" :class="line ? 'font-semibold text-wd-red-800' : 'text-muted-foreground'">
        {{ line ? line[0]!.toUpperCase() + line.slice(1) : 'On WeDance — nothing with you yet' }}
      </p>
      <p v-if="!compact" class="mt-1 text-xs text-muted-foreground">{{ c.sourceLabel }} · {{ when(c.createdAt) }}<template v-if="!c.account && !stacked"> · no WeDance account</template></p>
      <p v-if="c.note" class="mt-1 whitespace-pre-line text-sm text-muted-foreground">{{ c.note }}</p>
    </div>
  </div>
</template>
