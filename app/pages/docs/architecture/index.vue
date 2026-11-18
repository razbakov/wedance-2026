<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import { architectureNav } from '~/lib/architecture-nav'

definePageMeta({ layout: 'docs' })

const { meta, data } = useArchitecture()
const c = meta.counts

// Hand-written: the system context. Every integration below was checked
// against the code (file named in `where`) when this page was written; if you
// remove an integration from the code, remove it here too.
const integrations = [
  { name: 'Neon Postgres', role: 'The one production database, via the Neon HTTP driver + Drizzle ORM.', where: 'server/utils/db.ts' },
  { name: 'Vercel', role: 'Production hosting: Nitro `vercel` preset, builds and deploys only `main`; runs the daily review-asks cron.', where: 'vercel.json · scripts/vercel-ignore-build.sh' },
  { name: 'Hetzner (Dokploy)', role: 'PR previews at pr-<n>.dev.wedance.vip, each with its own scrubbed copy of production (`pr_<n>`).', where: '.github/workflows/preview.yml · ops/hetzner/README.md' },
  { name: 'Stripe', role: 'Festival ticket checkout and organiser subscriptions; webhook confirms payment, completes referrals, activates subscriptions.', where: 'server/trpc/routers/festivalSignup.ts · server/trpc/routers/organizerSubscription.ts · server/api/stripe/webhook.lib.ts' },
  { name: 'TicketTailor', role: 'HMAC-signed order webhook marks verified ticket holders for the attendee roster.', where: 'server/api/webhooks/tickettailor.post.ts' },
  { name: 'wedance.vip (v3 Firestore)', role: 'Read-only mirror of upcoming events and their venue/organiser/artist profiles (run with `bun run sync:v3-events`; no scheduler in this repo).', where: 'scripts/sync-v3-events.ts · server/utils/v3EventSync.ts · server/utils/v3ProfileSync.ts' },
  { name: 'Resend', role: 'Email: magic links, password reset, ticket confirmations, review asks, dance-friend matches, organiser emails to contacts.', where: 'server/utils/email.ts' },
  { name: 'Google Places', role: 'City search and resolution into the canonical `cities` table.', where: 'server/utils/cities/google.ts' },
  { name: 'Cloudinary', role: 'Image storage: uploads, painted flyers, schedule images, re-hosted Instagram images. Always served resized via `sizedImage`.', where: 'server/api/media/image.post.ts · server/utils/rehostImage.ts · server/utils/flyer/paint.ts' },
  { name: 'Gemini', role: 'Flyers: paints the image, reads text off a flyer, writes captions.', where: 'server/utils/flyer/gemini.ts' },
  { name: 'Apify', role: 'Instagram profile and post scraping: profile import, event from an Instagram post.', where: 'server/utils/instagram/apify.ts' },
  { name: 'Meta Graph API', role: 'Instagram publishing for pages that connect their account (Unified login).', where: 'server/utils/meta/graph.ts · server/utils/meta/instagramConnection.ts' },
  { name: 'Telegram Bot API', role: 'Posts a city\'s weekly schedule and occasion posts to its official channels and groups.', where: 'server/utils/telegram.ts' },
  { name: 'AI assistants (MCP)', role: 'WeDance is an MCP server: ChatGPT, Claude and others connect via OAuth and call WeDance tools.', where: 'server/routes/mcp.ts · server/oauth/' },
  { name: 'Linear', role: 'In-app problem reports and event inquiries become Linear issues.', where: 'server/trpc/routers/feedback.ts' },
  { name: 'PostHog', role: 'Product analytics (EU), no-op until a key is set.', where: 'app/plugins/03.posthog.client.ts' },
  { name: 'Sentry', role: 'Error monitoring + session replay, no-op until a DSN is set.', where: 'sentry.client.config.ts · sentry.server.config.ts' },
]

const stack = [
  ['Framework', 'Nuxt 4 (Vue 3, Vite), SSR on Vercel serverless'],
  ['API', 'tRPC 11 at /api/trpc (client-side calls) + a few Nitro REST routes for SSR and webhooks'],
  ['Data', 'Drizzle ORM on Neon Postgres; SQL migrations in server/database/migrations'],
  ['Validation', 'zod on the server (tRPC inputs), valibot in client forms'],
  ['UI', 'Tailwind 4 + shadcn-vue (reka-ui) components, the /docs/design system'],
  ['Auth', 'Own email + password (FirebaseScrypt hashes carried over from v4) and magic links; opaque session tokens in `sessions`, sent as a Bearer header'],
  ['Tests', 'vitest (unit + router), Playwright + playwright-bdd (e2e, design contract/a11y/visual)'],
]

const context = `flowchart LR
  dancer([Dancer]) --> web
  organiser([Organiser / venue / artist]) --> web
  admin([Admin]) --> web
  subgraph wd[WeDance 2026 on Vercel]
    web[Nuxt app<br/>pages + components] -->|tRPC / REST| api[Nitro server<br/>tRPC routers + API routes]
  end
  api --> db[(Neon Postgres<br/>${c.tables} tables)]
  api -->|checkout| stripe[Stripe]
  stripe -->|webhook| api
  tt[TicketTailor] -->|order webhook| api
  api -->|email| resend[Resend]
  api -->|places| google[Google Places]
  api -->|images| cloudinary[Cloudinary]
  api -->|flyers| gemini[Gemini]
  api -->|instagram import| apify[Apify]
  api -->|instagram posts| meta[Meta Graph API]
  api -->|city posts| telegram[Telegram]
  ai([AI assistants]) -->|MCP + OAuth| api
  cron[[Vercel cron<br/>review-asks daily]] --> api
  api -->|reports| linear[Linear]
  sync[[sync-v3-events<br/>manual]] -->|read-only| v3[(wedance.vip<br/>v3 Firestore)]
  sync --> db
  web -.->|analytics| posthog[PostHog]
  web -.->|errors + replay| sentry[Sentry]
  api -.-> sentry`

const sections = architectureNav.filter(s => s.title !== 'Getting started')
</script>

<template>
  <DesignPage
    eyebrow="WeDance architecture"
    site="WeDance Architecture"
    title="How WeDance is built"
    lead="The system as it exists in the code today. Everything past this page — data model, API, story map — is generated from the code on every build, so it cannot drift."
  >
    <DesignSection id="at-a-glance" title="At a glance">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <NuxtLink to="/docs/architecture/data" class="rounded-2xl border border-border bg-card p-4 hover:border-primary/40">
          <div class="text-3xl font-display font-bold">{{ c.tables }}</div>
          <div class="text-sm text-muted-foreground">tables in {{ data.domains.length }} contexts</div>
        </NuxtLink>
        <NuxtLink to="/docs/architecture/api" class="rounded-2xl border border-border bg-card p-4 hover:border-primary/40">
          <div class="text-3xl font-display font-bold">{{ c.procedures }}</div>
          <div class="text-sm text-muted-foreground">tRPC procedures in {{ c.routers }} routers</div>
        </NuxtLink>
        <NuxtLink to="/docs/architecture/api#rest" class="rounded-2xl border border-border bg-card p-4 hover:border-primary/40">
          <div class="text-3xl font-display font-bold">{{ c.rest }}</div>
          <div class="text-sm text-muted-foreground">REST &amp; webhook handlers</div>
        </NuxtLink>
        <NuxtLink to="/docs/architecture/stories" class="rounded-2xl border border-border bg-card p-4 hover:border-primary/40">
          <div class="text-3xl font-display font-bold">{{ c.stories }}</div>
          <div class="text-sm text-muted-foreground">mapped user stories</div>
        </NuxtLink>
      </div>
    </DesignSection>

    <DesignSection id="context" title="System context" lead="Who uses WeDance and which outside systems it talks to. Solid lines are runtime calls, dotted lines are client-side telemetry.">
      <ArchMermaid :code="context" label="System context diagram: dancers, organisers and admins use the Nuxt app on Vercel, whose server talks to Neon, Stripe, TicketTailor, Resend, Google Places, Cloudinary, Gemini, Apify, Meta, Telegram and Linear; AI assistants connect over MCP; a manually run script mirrors events from wedance.vip." />
    </DesignSection>

    <DesignSection id="contexts" title="Bounded contexts" lead="The domains the data model splits into today. One Nuxt app and one database hold all of them — the boundaries are conventions in the schema and the router files, not separate services.">
      <div class="grid sm:grid-cols-2 gap-3">
        <NuxtLink
          v-for="d in data.domains"
          :key="d.id"
          :to="`/docs/architecture/data#${d.id}`"
          class="group rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="font-bold">{{ d.title }}</span>
            <span class="text-xs text-muted-foreground">{{ d.tables.length }} tables</span>
          </div>
          <p class="text-sm text-muted-foreground mt-1">{{ d.summary }}</p>
        </NuxtLink>
      </div>
      <p class="text-sm text-muted-foreground mt-4">
        Two directories sit next to the relational core rather than in it: <strong>profiles</strong> are referenced by
        <em>handle</em> (text) from events, bookings and reviews, and <strong>cities</strong> are mostly free-text
        <code class="font-mono text-[13px]">city</code> / <code class="font-mono text-[13px]">city_slug</code> columns that the canonical
        <code class="font-mono text-[13px]">cities</code> table is meant to replace.
      </p>
    </DesignSection>

    <DesignSection id="stack" title="Stack">
      <dl class="divide-y divide-border rounded-2xl border border-border bg-card">
        <div v-for="[k, v] in stack" :key="k" class="grid sm:grid-cols-[10rem_1fr] gap-1 px-4 py-3">
          <dt class="font-bold text-sm">{{ k }}</dt>
          <dd class="text-sm text-muted-foreground">{{ v }}</dd>
        </div>
      </dl>
    </DesignSection>

    <DesignSection id="integrations" title="External integrations" lead="Each one verified in the code; the file is where to look first.">
      <div class="overflow-x-auto rounded-2xl border border-border bg-card">
        <table class="w-full text-sm">
          <thead class="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr><th class="px-4 py-2">Service</th><th class="px-4 py-2">What for</th><th class="px-4 py-2">Where</th></tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="i in integrations" :key="i.name">
              <td class="px-4 py-2.5 font-bold whitespace-nowrap">{{ i.name }}</td>
              <td class="px-4 py-2.5 text-muted-foreground">{{ i.role }}</td>
              <td class="px-4 py-2.5"><code class="font-mono text-[12px]">{{ i.where }}</code></td>
            </tr>
          </tbody>
        </table>
      </div>
    </DesignSection>

    <DesignSection id="explore" title="Explore">
      <div class="space-y-8">
        <div v-for="s in sections" :key="s.title">
          <h3 class="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-3">{{ s.title }}</h3>
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <NuxtLink
              v-for="item in s.items"
              :key="item.to"
              :to="item.to"
              class="group rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-bold">{{ item.title }}</span>
                <DesignStatus :status="item.status" />
              </div>
              <p class="text-sm text-muted-foreground mt-1">{{ item.summary }}</p>
              <ArrowRight class="w-4 h-4 mt-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </NuxtLink>
          </div>
        </div>
      </div>
    </DesignSection>
  </DesignPage>
</template>
