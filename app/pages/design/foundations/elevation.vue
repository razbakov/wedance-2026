<script setup lang="ts">
definePageMeta({ layout: 'design' })

const radii = [
  { cls: 'rounded-md', px: '8px', use: 'Inputs in dense admin UI, code chips' },
  { cls: 'rounded-lg', px: '10px', use: 'Small buttons, menu items' },
  { cls: 'rounded-xl', px: '14px', use: 'Tiles, small cards, swatches' },
  { cls: 'rounded-2xl', px: '16px', use: 'Cards, panels, dialogs' },
  { cls: 'rounded-3xl', px: '24px', use: 'Hero images, feature panels' },
  { cls: 'rounded-full', px: 'pill', use: 'CTAs, chips, avatars, filters — the most used shape' },
]

// The shadow recipes pages actually use (counted 2026-10-10). Tokens are proposed, not yet defined.
const shadows = [
  {
    name: 'Lip',
    css: '0 3px 0 -1px var(--wd-red-800)',
    proposed: '--wd-shadow-lip',
    use: 'The hard, offset under-edge on pill buttons — makes them feel pressable. Colour follows the button (red-800 on red, cyan-700 on cyan).',
    demo: 'lip',
  },
  {
    name: 'Card',
    css: '0 1px 0 color-mix(in srgb, var(--wd-brown-900) 4%, transparent), 0 6px 18px rgba(59,31,18,0.04)',
    proposed: '--wd-shadow-card',
    use: 'Hairline plus a warm, barely-there blur. Default for cards on cream.',
    demo: 'card',
  },
  {
    name: 'Sticker',
    css: '3px 4px 0 -1px <accent>',
    proposed: '--wd-shadow-sticker',
    use: 'Offset solid shadow in the item’s accent colour — the playful “stuck on” look for festival and plan cards.',
    demo: 'sticker',
  },
  {
    name: 'Float',
    css: '0 6px 20px rgba(0,0,0,0.18), 0 3px 0 -1px rgba(0,0,0,0.15)',
    proposed: '--wd-shadow-float',
    use: 'Things above the page: floating buttons, popovers, the report-a-problem pill.',
    demo: 'float',
  },
  {
    name: 'Focus halo',
    css: '0 0 0 3px color-mix(in srgb, var(--wd-red-600) 15%, transparent)',
    proposed: '--wd-shadow-focus',
    use: 'Soft ring around focused inputs. Keyboard focus on buttons uses the ring token instead.',
    demo: 'focus',
  },
]
</script>

<template>
  <DesignPage
    eyebrow="Foundations"
    title="Elevation"
    status="beta"
    lead="Soft, rounded and a little tactile. Pills for anything you tap, generous radii for surfaces, and shadows that feel printed rather than floating."
  >
    <DesignSection id="radius" title="Corner radius" lead="Tailwind radius classes, driven by --radius (0.625rem). Pick by size of the element, not by taste.">
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div v-for="r in radii" :key="r.cls" class="rounded-2xl border border-border bg-card p-4">
          <div class="h-16 bg-accent border-2 border-secondary/40" :class="r.cls" />
          <div class="mt-3 flex items-baseline justify-between gap-2">
            <code class="font-mono text-[13px] font-bold">{{ r.cls }}</code>
            <span class="font-mono text-[11px] text-muted-foreground">{{ r.px }}</span>
          </div>
          <p class="text-xs text-muted-foreground mt-1">{{ r.use }}</p>
        </div>
      </div>
    </DesignSection>

    <DesignSection id="shadows" title="Shadows" lead="Five recipes cover almost every surface. They are not tokens yet — 101 inline shadows still repeat them by hand. The proposed token names below will replace those.">
      <div class="space-y-4">
        <div v-for="s in shadows" :key="s.name" class="grid md:grid-cols-[14rem_1fr] rounded-2xl border border-border bg-card overflow-hidden">
          <div class="flex items-center justify-center p-8 bg-background/60">
            <span v-if="s.demo === 'lip'" class="inline-flex px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider shadow-[0_3px_0_-1px_var(--wd-red-800)]">Book</span>
            <span v-else-if="s.demo === 'card'" class="block w-36 h-20 rounded-2xl bg-card border border-border shadow-[0_1px_0_color-mix(in_srgb,var(--wd-brown-900)_4%,transparent),0_6px_18px_rgba(59,31,18,0.04)]" />
            <span v-else-if="s.demo === 'sticker'" class="block w-36 h-20 rounded-2xl bg-card border border-wd-purple-500/40 shadow-[3px_4px_0_-1px_var(--wd-purple-500)]" />
            <span v-else-if="s.demo === 'float'" class="inline-flex px-4 py-2 rounded-full bg-wd-brown-900 text-wd-cream text-xs font-bold shadow-[0_6px_20px_rgba(0,0,0,0.18),0_3px_0_-1px_rgba(0,0,0,0.15)]">Report a problem</span>
            <span v-else class="block w-40 h-10 rounded-full bg-white border border-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--wd-red-600)_15%,transparent)]" />
          </div>
          <div class="p-5">
            <div class="flex flex-wrap items-baseline gap-x-3">
              <h3 class="font-display font-bold text-xl">{{ s.name }}</h3>
              <code class="font-mono text-[12px] text-secondary">{{ s.proposed }}</code>
              <span class="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">proposed</span>
            </div>
            <p class="text-sm text-muted-foreground mt-1">{{ s.use }}</p>
            <code class="block mt-3 font-mono text-[12px] rounded-lg bg-muted px-3 py-2 break-all">box-shadow: {{ s.css }};</code>
          </div>
        </div>
      </div>
    </DesignSection>
  </DesignPage>
</template>
