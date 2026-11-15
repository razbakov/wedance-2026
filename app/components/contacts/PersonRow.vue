<script setup lang="ts">
/**
 * One contact on the Contacts page (RAZ-949): who, how to reach them, where
 * they came from, whether the page may email them, and what they do on WeDance
 * around the page's events. Read-only; the Contacts page adds the actions.
 */
import { Mail, Phone, StickyNote } from 'lucide-vue-next'
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
  /** Extra words after the source + date (locale, UTM, promo code). */
  detail?: string
  /** Hide the note (while the page edits it). */
  hideNote?: boolean
}>(), { compact: false, detail: '', hideNote: false })

const c = computed(() => props.contact)
const display = computed(() => c.value.name || c.value.account?.name || c.value.email)
const line = computed(() => activityLine(c.value.activity))
const wa = (p: string) => `https://wa.me/${p.replace(/[^\d+]/g, '').replace(/^00/, '+').replace(/^\+/, '')}`
const when = (d: string | Date) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
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
      <p v-if="c.account" class="mt-1 text-sm" :class="line ? 'font-semibold text-wd-red-800' : 'text-muted-foreground'">
        {{ line ? line[0]!.toUpperCase() + line.slice(1) : 'On WeDance — nothing with you yet' }}
      </p>
      <p v-if="!compact" class="mt-1 text-xs text-muted-foreground">{{ c.sourceLabel }} · {{ when(c.createdAt) }}<template v-if="detail"> · {{ detail }}</template><template v-if="!c.account"> · no WeDance account</template></p>
      <p v-if="c.note && !hideNote" class="mt-1 whitespace-pre-line text-sm"><StickyNote class="mr-1 inline size-3.5 text-muted-foreground" aria-hidden="true" />{{ c.note }}</p>
    </div>
  </div>
</template>
