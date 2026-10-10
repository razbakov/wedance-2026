<script setup lang="ts">
definePageMeta({ layout: 'design' })

const families = [
  { name: 'Display', cls: 'font-display', token: '--wd-font-display', stack: "'Playfair Display', serif", use: 'Headings, titles, numbers that matter, the brand voice.', sample: 'From your first night to your best year.' },
  { name: 'Display italic', cls: 'font-display italic', token: '--wd-font-display + italic', stack: "'Playfair Display', serif · italic", use: 'Warm asides and highlights — the slot Caveat used to fill.', sample: '— see who’s going before you book' },
  { name: 'Sans', cls: 'font-sans', token: '--wd-font-sans', stack: 'system-ui, sans-serif', use: 'Body copy, UI labels, buttons, forms, tables.', sample: 'Every dance. Every teacher. Every city.' },
]

const scale = [
  { name: 'Display', cls: 'text-5xl sm:text-6xl font-display font-bold leading-[1.05]', spec: 'text-5xl → 6xl · 48–60px · bold', use: 'Hero titles' },
  { name: 'H1', cls: 'text-4xl font-display font-bold leading-tight', spec: 'text-4xl · 36px · bold', use: 'Page titles' },
  { name: 'H2', cls: 'text-3xl font-display font-bold leading-tight', spec: 'text-3xl · 30px · bold', use: 'Section titles' },
  { name: 'H3', cls: 'text-2xl font-display font-bold', spec: 'text-2xl · 24px · bold', use: 'Card titles, sub-sections' },
  { name: 'H4', cls: 'text-xl font-display font-bold', spec: 'text-xl · 20px · bold', use: 'Small headings' },
  { name: 'Lead', cls: 'text-lg font-sans text-muted-foreground', spec: 'text-lg · 18px', use: 'Intro paragraph under a title' },
  { name: 'Body', cls: 'text-base font-sans', spec: 'text-base · 16px', use: 'Default reading text' },
  { name: 'Small', cls: 'text-sm font-sans', spec: 'text-sm · 14px', use: 'Secondary text, card body' },
  { name: 'Caption', cls: 'text-xs font-sans text-muted-foreground', spec: 'text-xs · 12px', use: 'Meta, timestamps, help text' },
  { name: 'Eyebrow', cls: 'text-[10px] uppercase tracking-[0.3em] font-bold text-secondary font-sans', spec: '10px · caps · 0.3em · amber', use: 'Label above a title' },
]

const eyebrow = `<div class="text-[10px] uppercase tracking-[0.3em] font-bold text-secondary">
  The journey
</div>
<h2 class="text-3xl font-display font-bold">
  From your first move to <span class="italic text-primary">your own stage.</span>
</h2>
<p class="text-lg text-muted-foreground">Whichever step you're on.</p>`
</script>

<template>
  <DesignPage
    eyebrow="Foundations"
    title="Typography"
    status="stable"
    lead="One serif for character, the system sans for everything you read and tap. Two families, nothing else."
  >
    <DesignSection id="families" title="Font families" lead="Consolidated on 2026-10-10. Caveat, Permanent Marker, Anton and DM Serif Display are retired.">
      <div class="space-y-4">
        <div v-for="f in families" :key="f.name" class="rounded-2xl border border-border bg-card p-6">
          <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span class="text-[10px] uppercase tracking-[0.3em] font-bold text-secondary">{{ f.name }}</span>
            <code class="font-mono text-[12px] text-muted-foreground">{{ f.cls }}</code>
            <code class="font-mono text-[12px] text-muted-foreground">var({{ f.token.split(' ')[0] }})</code>
          </div>
          <p class="text-3xl mt-3" :class="f.cls">{{ f.sample }}</p>
          <p class="text-sm text-muted-foreground mt-2">{{ f.use }} <span class="font-mono text-[12px]">· {{ f.stack }}</span></p>
        </div>
      </div>
    </DesignSection>

    <DesignSection id="scale" title="Type scale" lead="Use these steps. Arbitrary sizes like text-[13px] are the main source of visual drift — 415 of them remain in pages and are being migrated.">
      <div class="rounded-2xl border border-border bg-card divide-y divide-border">
        <div v-for="t in scale" :key="t.name" class="grid sm:grid-cols-[7rem_1fr_14rem] gap-x-6 gap-y-1 items-baseline px-5 py-4">
          <span class="text-xs font-bold uppercase tracking-wider text-secondary">{{ t.name }}</span>
          <span :class="t.cls" class="min-w-0 truncate">Dance tonight</span>
          <span class="text-xs text-muted-foreground"><span class="font-mono">{{ t.spec }}</span><br>{{ t.use }}</span>
        </div>
      </div>
    </DesignSection>

    <DesignSection id="heading-pattern" title="The heading pattern" lead="Eyebrow, serif title with one italic red phrase, lead in muted sans. The signature WeDance section opener.">
      <DesignExample :code="eyebrow">
        <div>
          <div class="text-[10px] uppercase tracking-[0.3em] font-bold text-secondary">The journey</div>
          <h3 class="text-3xl font-display font-bold mt-1">From your first move to <span class="italic text-primary">your own stage.</span></h3>
          <p class="text-lg text-muted-foreground mt-1">Whichever step you're on.</p>
        </div>
      </DesignExample>
    </DesignSection>

    <DesignSection id="guidelines" title="Guidelines">
      <div class="space-y-4">
        <DesignDoDont do-text="keep the italic highlight to one short phrase per heading." dont-text="italicise whole sentences or stack several highlights — the accent stops meaning anything.">
          <template #do>
            <span class="text-2xl font-display font-bold">Plan <span class="italic text-primary">the year.</span></span>
          </template>
          <template #dont>
            <span class="text-2xl font-display font-bold italic text-primary">Plan <span class="text-wd-green-600">the whole</span> year <span class="text-info">now.</span></span>
          </template>
        </DesignDoDont>
        <DesignDoDont do-text="set body, buttons and forms in the sans for fast reading on a phone." dont-text="set long paragraphs or form labels in the display serif.">
          <template #do>
            <p class="text-sm font-sans max-w-56">Weekly socials and practicas. Go with friends.</p>
          </template>
          <template #dont>
            <p class="text-sm font-display max-w-56">Weekly socials and practicas. Go with friends.</p>
          </template>
        </DesignDoDont>
      </div>
    </DesignSection>
  </DesignPage>
</template>
