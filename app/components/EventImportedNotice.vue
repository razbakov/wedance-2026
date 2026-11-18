<script setup lang="ts">
/**
 * "Book my spot" on an event nobody on WeDance takes bookings for (RAZ-1007): the host / organiser
 * page has no team, so a sign-up would reach no one. Instead of the steps, say where the event
 * comes from, when we last checked it, and send the dancer to book there.
 */
import { ExternalLink, Info } from 'lucide-vue-next'
import { Button } from '~/components/ui/button'

const props = defineProps<{
  /** Mirrored by the wedance.vip sync (events.source = 'wedance-v3'), else added by hand. */
  imported: boolean
  /** Where it was copied from (the event's own link). */
  from?: string | null
  /** When the sync last saw it. */
  checkedAt?: string | null
  organizerName?: string | null
}>()

const host = computed(() => {
  try { return props.from ? new URL(props.from).hostname.replace(/^www\./, '') : null } catch { return null }
})
const checked = computed(() => props.checkedAt
  ? new Date(props.checkedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : null)
const org = computed(() => props.organizerName || 'The organiser')
</script>

<template>
  <div class="mt-3 max-w-xl rounded-2xl border border-border bg-card px-4 py-3 space-y-2 font-sans" role="status" data-signup-imported>
    <p class="inline-flex items-center gap-1.5 font-bold text-foreground">
      <Info class="size-4 text-secondary" aria-hidden="true" /> {{ imported ? 'Imported by WeDance' : 'Added by WeDance' }}
    </p>
    <p class="text-sm text-muted-foreground">
      {{ org }} doesn’t take bookings on WeDance yet.
      <template v-if="host">We copied this from <a :href="from!" target="_blank" rel="noopener noreferrer" class="font-bold text-foreground underline [overflow-wrap:anywhere]" data-outbound-kind="website">{{ host }}</a></template>
      <template v-else>We put it here from public info</template><template v-if="checked">, last checked {{ checked }}</template>.
      {{ host ? 'Book with them there.' : `Ask ${org} directly.` }}
    </p>
    <Button v-if="from" variant="outline-pill" size="pill-sm" as-child>
      <a :href="from" target="_blank" rel="noopener noreferrer" data-outbound-kind="ticket" data-signup-imported-book>
        Book on {{ host ?? 'their site' }} <ExternalLink aria-hidden="true" />
      </a>
    </Button>
  </div>
</template>
