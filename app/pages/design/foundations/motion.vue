<script setup lang="ts">
definePageMeta({ layout: 'design' })

const durations = [
  { name: 'Instant', ms: '80ms', use: 'Press feedback (active state)' },
  { name: 'Quick', ms: '150ms', use: 'Colour and border changes on hover — Tailwind transition-colors' },
  { name: 'Standard', ms: '220ms', use: 'Lift, scale, small movements' },
  { name: 'Slow', ms: '380–800ms', use: 'Ripples, gradient shifts, entrances' },
  { name: 'Ambient', ms: '4.5–6s loop', use: 'Background breathing and shimmer on the brand CTA only' },
]

const easings = [
  { name: 'Spring', css: 'cubic-bezier(0.34, 1.56, 0.64, 1)', use: 'Playful overshoot — lifts and pops' },
  { name: 'Ease-out', css: 'ease-out', use: 'Things arriving or settling' },
  { name: 'Ease-in-out', css: 'ease-in-out', use: 'Loops that go back and forth' },
]

const reduced = `@media (prefers-reduced-motion: reduce) {
  .wd-cta,
  .wd-cta::before {
    animation: none !important;
  }
}`
</script>

<template>
  <DesignPage
    eyebrow="Foundations"
    title="Motion"
    status="beta"
    lead="Motion should feel like a dancer’s bounce — quick, springy, never slow or floaty. It confirms what happened; it never makes you wait."
  >
    <DesignSection id="principles" title="Principles">
      <ul class="grid sm:grid-cols-3 gap-4">
        <li class="rounded-2xl border border-border bg-card p-5">
          <h3 class="font-display font-bold text-lg">Feedback first</h3>
          <p class="text-sm text-muted-foreground mt-1">Animate the result of an action — a press, a save, a selection. Don’t animate to decorate.</p>
        </li>
        <li class="rounded-2xl border border-border bg-card p-5">
          <h3 class="font-display font-bold text-lg">One showpiece per screen</h3>
          <p class="text-sm text-muted-foreground mt-1">Ambient loops (breathing, shimmer) belong to the single main CTA. Everything else stays still at rest.</p>
        </li>
        <li class="rounded-2xl border border-border bg-card p-5">
          <h3 class="font-display font-bold text-lg">Respect reduced motion</h3>
          <p class="text-sm text-muted-foreground mt-1">Every loop and large movement switches off under prefers-reduced-motion.</p>
        </li>
      </ul>
    </DesignSection>

    <DesignSection id="showcase" title="The brand CTA" lead="Hover, press and watch: breathing gradient, shimmer sweep, springy lift, press-down and a click ripple — all from one class.">
      <DesignExample code='<button class="wd-cta inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider">
  Find your next festival
</button>' center>
        <button type="button" class="wd-cta inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider">
          Find your next festival
        </button>
      </DesignExample>
    </DesignSection>

    <DesignSection id="durations" title="Durations">
      <div class="rounded-2xl border border-border bg-card divide-y divide-border">
        <div v-for="d in durations" :key="d.name" class="grid grid-cols-[7rem_8rem_1fr] gap-4 px-5 py-3 text-sm">
          <span class="font-bold">{{ d.name }}</span>
          <code class="font-mono text-secondary">{{ d.ms }}</code>
          <span class="text-muted-foreground">{{ d.use }}</span>
        </div>
      </div>
    </DesignSection>

    <DesignSection id="easing" title="Easing">
      <div class="rounded-2xl border border-border bg-card divide-y divide-border">
        <div v-for="e in easings" :key="e.name" class="grid sm:grid-cols-[7rem_18rem_1fr] gap-x-4 gap-y-1 px-5 py-3 text-sm">
          <span class="font-bold">{{ e.name }}</span>
          <code class="font-mono text-secondary text-[12px]">{{ e.css }}</code>
          <span class="text-muted-foreground">{{ e.use }}</span>
        </div>
      </div>
    </DesignSection>

    <DesignSection id="reduced-motion" title="Reduced motion" lead="Required for every looping or large animation.">
      <DesignCode :code="reduced" lang="css" />
    </DesignSection>
  </DesignPage>
</template>
