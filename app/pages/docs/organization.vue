<script setup lang="ts">
import { ArrowUpRight, Lock } from 'lucide-vue-next'
import { GOVERNANCE_URL, ISSUES_URL } from '~/lib/docs-nav'

definePageMeta({ layout: 'docs' })

// Moved here from org.wedance.vip (the public half of the org site). The source of truth for
// governance is still the private wedance-org repo; this page is the public summary of it.
// Current focus = ~/Orgs/WeDance/00_Organization_Logbook/07_Q4_2026_Objective.md: update both together.

const problems = [
  {
    title: 'Dancers can\'t see the real picture',
    body: 'Classes, socials and festivals are spread over Instagram stories, WhatsApp groups and organiser websites. Dancers piece it together by hand and still can\'t tell whether an event fits their level, style or budget.',
  },
  {
    title: 'Organisers work blind',
    body: 'They can\'t see who is coming or what people need until it\'s too late to adjust, and every event means hours of promotion by hand.',
  },
]

const focus = [
  'Five organisers use WeDance flyers for their events this quarter, free, in exchange for honest feedback.',
  'At least ten of the flyers they keep end up on their own Instagram and channels.',
  'At least four of the five say they\'d use WeDance instead of Canva or a designer.',
  'At least three come back to make flyers in three different weeks without being asked.',
]

const parked = [
  { title: 'Pricing', body: 'Decided in January from what organisers say flyers are worth to them.' },
  { title: 'Festival schedule and meetup planner', body: 'The earlier plan. Reviewed again in Q1.' },
  { title: 'New dancer-side features', body: 'What shipped stays; nothing new until the flyer test is done.' },
]

const principles = [
  { title: 'Effectiveness', body: 'Spend time only on what moves us toward the objective.' },
  { title: 'Consent', body: 'Raise, look for and resolve objections to proposals and policies.' },
  { title: 'Empiricism', body: 'Test assumptions with experiments and keep revising.' },
  { title: 'Continuous improvement', body: 'Review outcomes regularly and improve in small steps.' },
  { title: 'Equivalence', body: 'Involve the people a decision affects.' },
  { title: 'Transparency', body: 'Write down what matters and make it available to everyone.' },
  { title: 'Accountability', body: 'Respond when something is needed; do what you agreed to do.' },
]

type DomainStatus = 'Focus' | 'Live' | 'Partly built' | 'Parked'
const domains: { name: string, status: DomainStatus, body: string }[] = [
  { name: 'Organiser tools', status: 'Focus', body: 'Business pages, events, flyers and captions, posting to Instagram. The Q4 test runs here.' },
  { name: 'Discovery', status: 'Live', body: 'Every event per city in one place. Over a thousand upcoming events are kept in sync from wedance.vip.' },
  { name: 'Marketplace', status: 'Partly built', body: 'Artists and venues that organisers can find, invite and book. Built, but not a focus this quarter.' },
  { name: 'Festival Experience', status: 'Parked', body: 'The interactive festival schedule and planning before arrival. Reviewed again in Q1.' },
]
const statusClass: Record<DomainStatus, string> = {
  'Focus': 'bg-primary text-primary-foreground border-transparent',
  'Live': 'bg-secondary text-secondary-foreground border-transparent',
  'Partly built': '',
  'Parked': 'text-muted-foreground',
}

const help = [
  {
    title: 'You organise events in Munich',
    body: 'Try flyers for your next event, free, and tell us honestly whether you\'d post them.',
    href: 'mailto:hello@wedance.vip?subject=Flyers%20for%20my%20events',
    cta: 'Say hello',
  },
  {
    title: 'You design',
    body: 'Help us judge and improve flyer quality: what makes an organiser post one as their own.',
    href: 'mailto:hello@wedance.vip?subject=Design',
    cta: 'Say hello',
  },
  {
    title: 'You build',
    body: 'The app is open source. Take an issue, open a pull request; what you ship is the application.',
    href: ISSUES_URL,
    cta: 'Open issues',
  },
]
</script>

<template>
  <DesignPage
    eyebrow="Community"
    site="WeDance Docs"
    title="How we're organised"
    lead="WeDance is a dance community platform and a small organisation run in the open with Sociocracy 3.0: why it exists, what we're testing now, how we decide and where you can help."
  >
    <DesignSection id="driver" title="Why WeDance exists">
      <div class="grid sm:grid-cols-2 gap-4">
        <div v-for="p in problems" :key="p.title" class="rounded-2xl border border-border bg-card p-5">
          <h3 class="font-display font-bold text-lg">{{ p.title }}</h3>
          <p class="text-sm text-muted-foreground mt-1.5">{{ p.body }}</p>
        </div>
      </div>
      <p class="text-muted-foreground mt-4 max-w-2xl">
        What good looks like: dancers find every event in their city from one place and can judge which
        ones fit them; organisers reach the right people and can see what their promotion did.
      </p>
    </DesignSection>

    <DesignSection
      id="now"
      title="What we're testing now"
      lead="Q4 2026, until 31 December: are WeDance flyers good enough for real organisers to post them as their own?"
    >
      <p class="text-muted-foreground max-w-2xl">
        An organiser gets an on-brand flyer and captions in seconds instead of an hour in Canva.
        Before we charge for it, we want to know the quality holds up. It counts as proven when:
      </p>
      <ol class="mt-4 space-y-2 max-w-2xl">
        <li v-for="(f, i) in focus" :key="f" class="flex gap-3">
          <span class="font-display font-bold text-primary w-5 shrink-0">{{ i + 1 }}</span>
          <span>{{ f }}</span>
        </li>
      </ol>
      <p class="text-sm text-muted-foreground mt-4">
        We measure it with real usage, and publish the numbers on
        <NuxtLink to="/open" class="font-bold text-wd-red-800 hover:underline">open metrics</NuxtLink>.
      </p>
      <h3 class="font-display font-bold text-lg mt-8">Not this quarter</h3>
      <ul class="grid sm:grid-cols-3 gap-3 mt-3">
        <li v-for="p in parked" :key="p.title" class="rounded-2xl border border-border p-4">
          <span class="font-bold">{{ p.title }}</span>
          <p class="text-sm text-muted-foreground mt-1">{{ p.body }}</p>
        </li>
      </ul>
    </DesignSection>

    <DesignSection
      id="decide"
      title="How we decide"
      lead="One owner, Alex Razbakov, gives each area of work to a role. Several roles are run day to day by AI agents, and a person can take any of them over. Seven principles from Sociocracy 3.0 keep it honest."
    >
      <dl class="grid sm:grid-cols-2 gap-3">
        <div v-for="p in principles" :key="p.title" class="rounded-2xl border border-border bg-card p-4">
          <dt class="font-bold">{{ p.title }}</dt>
          <dd class="text-sm text-muted-foreground mt-1">{{ p.body }}</dd>
        </div>
      </dl>
    </DesignSection>

    <DesignSection id="structure" title="Areas of work">
      <ul class="space-y-3">
        <li v-for="d in domains" :key="d.name" class="rounded-2xl border border-border bg-card p-5">
          <div class="flex flex-wrap items-center gap-2">
            <h3 class="font-display font-bold text-lg">{{ d.name }}</h3>
            <Badge variant="outline" :class="statusClass[d.status]">{{ d.status }}</Badge>
          </div>
          <p class="text-sm text-muted-foreground mt-1.5">{{ d.body }}</p>
        </li>
      </ul>
    </DesignSection>

    <DesignSection id="join" title="Where you can help">
      <p class="text-muted-foreground max-w-2xl mb-4">
        We don't post job ads. Start with something real; if it fits, we agree on a role together.
        No CV, no cover letter.
      </p>
      <div class="grid sm:grid-cols-3 gap-4">
        <a
          v-for="h in help"
          :key="h.title"
          :href="h.href"
          class="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/40"
        >
          <h3 class="font-display font-bold text-lg">{{ h.title }}</h3>
          <p class="text-sm text-muted-foreground mt-1.5">{{ h.body }}</p>
          <span class="inline-flex items-center gap-1 text-sm font-bold text-primary mt-3">{{ h.cta }} <ArrowUpRight class="size-4" aria-hidden="true" /></span>
        </a>
      </div>
    </DesignSection>

    <DesignSection id="documents" title="The full documents">
      <p class="text-muted-foreground max-w-2xl">
        Every policy, role, area and decision lives in our governance repository. That is the source of
        truth; this page summarises it.
      </p>
      <a :href="GOVERNANCE_URL" class="inline-flex items-center gap-2 font-bold text-wd-red-800 hover:underline mt-3">
        <Lock class="size-4" aria-hidden="true" /> Governance documents (team sign-in)
      </a>
    </DesignSection>
  </DesignPage>
</template>
