<script setup lang="ts">
/**
 * /sketches/contacts — entry to the Contacts layout options (RAZ-949). The
 * variants run on a page's real contacts, so they live in Business mode
 * (/business/network/<handle>/contacts-variants); this lists the pages you
 * manage and opens the options for one of them.
 */
import { ArrowRight } from 'lucide-vue-next'

definePageMeta({ layout: false })
useHead({ title: 'Contacts layouts — WeDance sketches', meta: [{ name: 'robots', content: 'noindex' }] })

const { $trpc } = useNuxtApp()
const pages = ref<{ username: string, name: string }[] | null>(null)
const signedOut = ref(false)
onMounted(async () => {
  try {
    if (!(await $trpc.auth.me.query())) { signedOut.value = true; return }
    pages.value = (await $trpc.business.myProfiles.query()).managed
  } catch { signedOut.value = true }
})
</script>

<template>
  <div class="min-h-screen bg-background">
    <SiteHeader />
    <section class="mx-auto max-w-2xl px-4 py-10">
      <p class="text-eyebrow font-black uppercase tracking-widest text-secondary">Sketch · RAZ-949</p>
      <h1 class="mt-1 font-display text-4xl">Contacts: <em class="italic text-primary">five layouts.</em></h1>
      <p class="mt-3 text-muted-foreground">
        Options for a page’s Contacts: see each source and who can be emailed, and what each contact does on WeDance.
        They run on the page’s real contacts, read-only. Pick a page you manage.
      </p>
      <p v-if="signedOut" class="mt-6 text-sm">Sign in, then open this again.</p>
      <p v-else-if="pages && !pages.length" class="mt-6 text-sm">You don’t manage a page yet.</p>
      <ul v-else-if="pages" class="mt-6 grid gap-2">
        <li v-for="p in pages" :key="p.username">
          <NuxtLink :to="`/business/network/${p.username}/contacts-variants`" class="flex items-center justify-between rounded-2xl border bg-card p-4 shadow-wd-card hover:border-primary/40">
            <span><b>{{ p.name }}</b> <span class="text-muted-foreground">@{{ p.username }}</span></span>
            <ArrowRight class="size-4" aria-hidden="true" />
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
