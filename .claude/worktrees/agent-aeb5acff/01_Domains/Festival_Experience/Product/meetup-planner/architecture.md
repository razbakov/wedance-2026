# Architecture: WeDance Meetup Planner MVP

## Context

WeDance is building "Timeleft for dance festivals" — a social activity platform connecting dancers around festival experiences. The MVP targets **one pilot festival** with manual matching, no automated algorithms, and WhatsApp/Telegram for communication. The goal is hypothesis validation: will 10+ dancers sign up and 50%+ attend activities?

The existing Nuxt 4 app is 100% client-side with mock data. This architecture adds a thin backend layer within the Nuxt ecosystem to support real sign-ups, activities, freemium paywall, and organizer matching tools.

---

## 1. System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Vercel (SSR)                          │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────┐  │
│  │  Nuxt SSR    │───▶│  tRPC Router │───▶│   Neon     │  │
│  │  (Vue 3)     │    │  (trpc-nuxt) │    │ (Postgres) │  │
│  │  app/        │    │  server/trpc/ │    └────────────┘  │
│  └──────┬───────┘    └──────┬───────┘                    │
│         │                   │                            │
│  ┌──────┴───────┐    ┌──────┴───────┐                    │
│  │ tRPC Client  │    │ Drizzle ORM  │                    │
│  │ useClient()  │    │ (type-safe)  │                    │
│  └──────────────┘    └──────────────┘                    │
│                                                          │
│  External: Stripe (€1) · Resend (email) · Google OAuth   │
└──────────────────────────────────────────────────────────┘
```

**Key decisions:**
- **Neon (Postgres)** — serverless PostgreSQL, free tier (0.5GB, 190K compute hours/mo), industry standard, no migration needed later
- **Drizzle ORM** — type-safe SQL mapping directly from existing TypeScript interfaces, excellent Postgres support
- **tRPC via `trpc-nuxt`** — end-to-end type safety between server and client; procedures replace REST routes; input/output types are shared automatically
- **SSR mode** — switch from static generation to SSR for runtime server routes
- **Continue composables pattern** — no Pinia; new composables wrap tRPC client calls

---

## 2. Database Schema

Maps from existing types in `app/types/festival.ts`. Core tables:

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `dancers` | User identity | id, email, name, photo, city, bio, role, google_id |
| `dancer_styles` | Dance styles + levels | dancer_id, style_name, level |
| `festivals` | Festival data (seeded) | slug, name, dates, venue, social_links (JSON) |
| `festival_signups` | Dancer ↔ Festival join | festival_id, dancer_id, is_free_spot, paid, stripe_payment_id |
| `rides` | Ride offers/requests | festival_id, dancer_id, type (offering/looking), origin_city, date, seats |
| `ride_groups` + `ride_group_members` | Manual ride matching | chat_link, member ride IDs |
| `room_searches` | Roommate toggle | festival_id, dancer_id, active flag |
| `room_groups` + `room_group_members` | Manual room matching | chat_link, member dancer IDs |
| `dinners` | Group dinner slots | festival_id, day, time_slot, restaurant, max_size, reveal_date |
| `dinner_signups` | Dinner RSVP | dinner_id, dancer_id |
| `dinner_groups` + `dinner_group_members` | Manual dinner grouping | chat_link, member dancer IDs |
| `dancer_likes` | Swipe right | festival_id, from_dancer, to_dancer |
| `dance_feedback` | Post-dance rating/text | from_dancer, to_dancer, danced, rating, feedback_text |
| `endorsements` | Style endorsements | from_dancer, to_dancer, style_name |
| `extra_activities` + `activity_signups` | Community activities | title, date, time, max_participants |

IDs are UUIDs (`uuid` type in Postgres, generated via `gen_random_uuid()`). Mutual matches = bidirectional rows in `dancer_likes`. Mutual reveal = both rows exist in `dance_feedback`/`endorsements`.

---

## 3. tRPC Router Structure

All procedures live in `server/trpc/routers/`. The tRPC integration uses `trpc-nuxt` which mounts the router at `/api/trpc`. Stripe webhook remains a plain Nuxt server route (needs raw body access).

```
server/trpc/
  routers/
    auth.ts                   # login, verify, me, logout
    festival.ts               # getBySlug (festival + aggregated counts)
    signup.ts                 # create (freemium gate), freemium status
    ride.ts                   # list, create
    room.ts                   # list, toggle
    dinner.ts                 # list, join, leave
    like.ts                   # create, remove
    match.ts                  # list (mutual matches)
    feedback.ts               # submit, get
    endorsement.ts            # create, get
    activity.ts               # list, join
    admin.ts                  # signups, rideGroups, roomGroups, dinnerGroups, reveal
  context.ts                  # Creates context (db, session) for each request
  trpc.ts                     # tRPC instance, middleware (auth, admin)
  index.ts                    # appRouter = mergeRouters(...)

server/api/
  trpc/[trpc].ts              # trpc-nuxt handler (mounts appRouter)
  webhooks/stripe.post.ts     # Plain route — Stripe needs raw body
```

**Example procedure** (`server/trpc/routers/ride.ts`):
```ts
export const rideRouter = router({
  list: protectedProcedure
    .input(z.object({ festivalSlug: z.string() }))
    .query(({ ctx, input }) => { /* Drizzle query */ }),
  create: protectedProcedure
    .input(z.object({
      festivalSlug: z.string(),
      type: z.enum(['offering', 'looking']),
      originCity: z.string(),
      date: z.string(),
      seatsAvailable: z.number().optional(),
    }))
    .mutation(({ ctx, input }) => { /* Drizzle insert */ }),
})
```

**Client usage** (in composables):
```ts
const { $client } = useNuxtApp()
const { data: rides } = $client.ride.list.useQuery({ festivalSlug })
await $client.ride.create.mutate({ festivalSlug, type: 'offering', ... })
```

---

## 4. Authentication

**Minimal: email verification code + optional Google OAuth.**

- **Primary**: Dancer enters name + email → server sends 6-digit code via Resend → dancer enters code → `h3` session cookie set
- **Secondary**: "Continue with Google" via `nuxt-auth-utils` module
- **Session**: httpOnly signed cookie with `{ dancerId, email, isAdmin }`
- **Admin**: hardcoded email list in env var `ADMIN_EMAILS`
- **No passwords, no JWT, no refresh tokens** — MVP simplicity

---

## 5. Client-Side Data Flow

New composables (alongside unchanged `useCart`, `useWeekPlan`, `useYearPlan`):

| Composable | Wraps (tRPC procedures) | Components |
|------------|------------------------|------------|
| `useAuth()` | `auth.*` | SignUpModal, layout |
| `useFestivalData(slug)` | `festival.getBySlug`, `ride.list`, `dinner.list`, `room.list` | ActivitiesTab, CartDrawer |
| `useSwipeDeck(slug)` | `like.create/remove`, `match.list` | DiscoverDancers |
| `useDanceList(slug)` | `feedback.*`, `endorsement.*` | DiscoverDancers (post-dance) |
| `useFreemium(slug)` | `signup.freemiumStatus` | PaywallModal |

Pattern: `$client.router.procedure.useQuery()` for reads, `$client.router.procedure.mutate()` for mutations with optimistic updates. Types flow end-to-end from Drizzle schema → tRPC router → client — no manual type duplication.

Workshop schedule and year plan stay as client-side mock data — they're read-only and not in MVP scope for backend persistence.

---

## 6. Freemium / Payment Flow

```
Action (join dinner, post ride, etc.)
  → Signed in? No → SignUpModal
  → Yes → Free spots < 10? → Claim free spot
  → Free spots >= 10? → PaywallModal → Stripe Checkout → webhook confirms → activity unlocked
```

- **Stripe Checkout Session** (hosted page, no PCI burden)
- Or simpler: **Stripe Payment Link** (zero code, organizer creates in dashboard)
- Webhook at `/api/webhooks/stripe` marks `festival_signups.paid = 1`
- Counter via tRPC: `signup.freemiumStatus` → `{ freeSpotsTaken, maxFreeSpots, userUnlocked }`

---

## 7. Admin / Organizer Tools

Single page at `/admin/festivals/[slug]` (protected by admin middleware):

1. **Signups table** — all dancers with name, email, city, styles, role, free/paid status
2. **Ride matching** — list offering/looking, filter by city, checkbox-select → "Group selected" → enter WhatsApp link
3. **Room matching** — list dancers with toggle on, same group UI
4. **Dinner grouping** — per time slot, show signups, "Auto-suggest" (round-robin 4-6), adjust, finalize with chat links
5. **Restaurant reveal** — button to make restaurant visible to group

No drag-and-drop. Checkbox + button is sufficient for the pilot (organizer = WeDance team).

---

## 8. New Dependencies

```
drizzle-orm @neondatabase/serverless  # Database (Drizzle + Neon serverless driver)
drizzle-kit                           # Migrations (dev)
trpc-nuxt @trpc/server @trpc/client zod  # tRPC end-to-end type safety
nuxt-auth-utils                       # Google OAuth + session
@stripe/stripe-node                   # Payment
resend                                # Email (login codes)
```

---

## 9. Migration Path (Incremental)

Feature flag in `nuxt.config.ts` → `runtimeConfig.public.useRealBackend: false` lets each feature toggle independently.

| Phase | What | UI changes |
|-------|------|------------|
| **1** | Server infra: Drizzle schema, Neon connection, tRPC router, migrations, seed festival data | None |
| **2** | Auth: `useAuth()`, real SignUpModal, session | Replace `isSignedIn = ref(false)` |
| **3a** | Freemium: signup + free spot counter | PaywallModal wired to Stripe |
| **3b** | Rides: tRPC procedures + composable | ActivitiesTab, CartDrawer use real data |
| **3c** | Rooms: tRPC procedures + composable | CartDrawer uses real data |
| **3d** | Dinners: tRPC procedures + composable | Swipe deck + CartDrawer use real data |
| **3e** | Partners: likes + matches | DiscoverDancers uses real data |
| **3f** | Feedback: ratings + endorsements | Dance list uses real data |
| **4** | Admin page | New page, no existing component changes |
| **5** | Stripe webhook | PaywallModal → real payment |

---

## 10. File Structure (New Files)

```
engineering/nuxt-app/
  server/
    database/
      schema.ts                    # Drizzle table definitions (Postgres)
      migrations/                  # Generated SQL
    trpc/
      trpc.ts                      # tRPC instance + middleware
      context.ts                   # Request context (db, session)
      index.ts                     # Merged appRouter
      routers/
        auth.ts                    # login, verify, me, logout
        festival.ts                # getBySlug
        signup.ts                  # create, freemiumStatus
        ride.ts                    # list, create
        room.ts                    # list, toggle
        dinner.ts                  # list, join, leave
        like.ts                    # create, remove
        match.ts                   # list
        feedback.ts                # submit, get
        endorsement.ts             # create, get
        activity.ts                # list, join
        admin.ts                   # signups, groups, reveal
    api/
      trpc/[trpc].ts              # trpc-nuxt handler
      webhooks/stripe.post.ts     # Plain route (raw body)
    middleware/auth.ts
    utils/db.ts, session.ts, stripe.ts
  app/
    composables/
      useAuth.ts                   # NEW
      useFestivalData.ts           # NEW
      useSwipeDeck.ts              # NEW
      useDanceList.ts              # NEW
      useFreemium.ts               # NEW
    pages/admin/festivals/[slug].vue  # NEW
    components/PaywallModal.vue       # NEW
    plugins/trpc.ts                # NEW — tRPC client plugin
  drizzle.config.ts
```

---

## 11. Verification

1. **Auth**: Sign up with email → receive code → enter code → session persists across refresh
2. **Freemium**: Sign up 10 dancers → 11th sees paywall → pay €1 → unlocked
3. **Activities**: Post a ride → visible to other dancers → organizer groups in admin → WhatsApp link appears
4. **Swipe**: Like dancer → they like back → appears in My Dance List → mark danced → endorse → mutual reveal
5. **BDD tests**: All 7 feature files pass against real backend (toggle feature flag per test suite)
6. **Admin**: Organizer sees all signups, creates groups, reveals restaurants
