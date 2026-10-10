<script setup lang="ts">
/**
 * /imprint — legally required imprint (§5 DDG). PLACEHOLDER.
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
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&display=swap' },
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
  <div class="min-h-screen" style="background:var(--wd-cream); color:var(--wd-brown-900); font-family:var(--wd-font-display);">
    <SiteHeader />
    <section class="max-w-3xl mx-auto px-4 py-12">
      <div class="text-sm tracking-widest uppercase mb-3" style="color:var(--wd-amber-600);">Legal</div>
      <h1 class="text-4xl sm:text-5xl leading-tight" style="color:var(--wd-brown-900);">Imprint</h1>

      <div class="mt-6 rounded-xl p-4 text-sm" style="background:color-mix(in srgb, var(--wd-red-600) 6.3%, transparent); border:1px solid color-mix(in srgb, var(--wd-red-600) 20%, transparent); color:var(--wd-brown-700); font-family:var(--wd-font-sans);">
        ⚠️ Draft. Replace the placeholders below with the real operator details before launch — an incomplete imprint is an Abmahnung risk under §5 DDG.
      </div>

      <dl class="mt-6 grid sm:grid-cols-[200px_1fr] gap-x-6 gap-y-3 text-sm" style="color:var(--wd-brown-900); font-family:var(--wd-font-sans);">
        <template v-for="[k, v] in rows" :key="k">
          <dt class="font-bold" style="color:var(--wd-amber-600);">{{ k }}</dt>
          <dd>{{ v }}</dd>
        </template>
      </dl>
    </section>
    <SiteFooter />
  </div>
</template>
