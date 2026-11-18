<script setup lang="ts">
/**
 * Settings → Emails (RAZ-985): the "<name> said yes too" email switch. Saves on
 * change. Off = matches still show on My plan, no email.
 */
import { Check } from 'lucide-vue-next'

const { $trpc } = useNuxtApp()
const matchEmails = ref(true)
const loaded = ref(false)
const saved = ref(false)
const error = ref('')

onMounted(async () => {
  try { matchEmails.value = (await $trpc.plan.emailPrefs.query()).matchEmails }
  catch (err) { console.warn('[settings] email prefs failed:', err) }
  loaded.value = true
})

watch(matchEmails, async (on, before) => {
  if (!loaded.value || on === before) return
  saved.value = false
  error.value = ''
  try {
    await $trpc.plan.setEmailPrefs.mutate({ matchEmails: on })
    saved.value = true
  } catch {
    error.value = 'Couldn’t save — try again.'
    loaded.value = false
    matchEmails.value = before
    loaded.value = true
  }
})
</script>

<template>
  <div class="space-y-2" data-testid="settings-emails">
    <Checkbox v-model="matchEmails" class="items-start" :disabled="!loaded">
      <span class="text-muted-foreground">
        <span class="font-bold text-foreground">When someone says yes back</span><br>
        An email when a dancer you said yes to says yes to you too. At most one a day. Off: you still see them on My plan.
      </span>
    </Checkbox>
    <p v-if="saved" role="status" class="inline-flex items-center gap-1.5 text-sm font-bold text-wd-green-600"><Check class="w-4 h-4" aria-hidden="true" /> Saved</p>
    <p v-if="error" role="alert" class="text-sm font-bold text-primary">{{ error }}</p>
  </div>
</template>
