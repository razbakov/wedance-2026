<script setup lang="ts">
// "Cancelled · It's on again" for a cancelled event's managers, in the "You manage
// this event" bar on the public page (RAZ-948). The same flow as the editor
// (BusinessUncancelEvent, RAZ-969): it asks whether to email the people who were
// told it was off. The page reloads so the hero drops the "Cancelled" state.
defineProps<{ eventId: string }>()
function reload() { window.location.reload() }
</script>

<template>
  <span class="inline-flex flex-wrap items-center gap-2">
    <span class="text-destructive font-bold">Cancelled</span>
    <BusinessUncancelEvent :id="eventId" @uncancelled="reload" />
  </span>
</template>
