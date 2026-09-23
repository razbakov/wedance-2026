<script setup lang="ts">
/**
 * /impressum — legally required imprint (§5 DDG). PLACEHOLDER.
 * Route: /impressum (German for legacy; content is English).
 * The fields below must be filled with the real operator details before
 * launch. Do not ship ticket sales without a complete, accurate imprint.
 */
definePageMeta({ layout: false })
useHead({
  title: 'WeDance — Imprint',
  meta: [{ name: 'robots', content: 'noindex' }],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

// TODO: replace every [placeholder] with the real operating entity.
const rows = [
  ['Operator', '[Legal name / company]'],
  ['Legal form', '[e.g. Einzelunternehmen (Kleinunternehmer §19 UStG) / GmbH / e.V.]'],
  ['Address', '[Street, postal code, city, Germany]'],
  ['Email', '[contact email]'],
  ['Phone', '[phone number]'],
  ['Represented by', '[responsible person]'],
  ['Register', '[Handelsregister / Vereinsregister no., if applicable]'],
  ['VAT ID', '[USt-IdNr, if applicable]'],
  ['Responsible for content (§18 MStV)', '[name + address]'],
]
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <SiteHeader />
    <section class="max-w-3xl mx-auto px-4 py-12">
      <div class="text-sm tracking-widest uppercase mb-3" style="color:#9a5614;">Legal</div>
      <h1 class="text-4xl sm:text-5xl leading-tight" style="color:#3b1f0d;">Imprint</h1>

      <div class="mt-6 rounded-xl p-4 text-sm" style="background:#dc262610; border:1px solid #dc262633; color:#5b3a1d; font-family: system-ui, sans-serif;">
        ⚠️ Draft. Replace the placeholders below with the real operator details before launch — an incomplete imprint is a legal risk.
      </div>

      <dl class="mt-6 grid sm:grid-cols-[200px_1fr] gap-x-6 gap-y-3 text-sm" style="color:#3b1f0d; font-family: system-ui, sans-serif;">
        <template v-for="[k, v] in rows" :key="k">
          <dt class="font-bold" style="color:#9a5614;">{{ k }}</dt>
          <dd>{{ v }}</dd>
        </template>
      </dl>
    </section>
    <SiteFooter />
  </div>
</template>
