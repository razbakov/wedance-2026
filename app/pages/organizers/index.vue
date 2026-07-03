<script setup lang="ts">
/**
 * /organizers — For festival organizers.
 * Restyled 2026-07-02 to match the V3 tropical direction on /.
 * Same warm cream + rose + palm-green palette, Playfair Display + Caveat.
 * Removed fake stats bar and pravatar testimonials — they contradicted
 * the "no fake friends" promise the homepage is built on. Real quotes
 * can go back in once we have them.
 */
import {
  ArrowRight,
  CalendarDays,
  Users,
  Heart,
  Ticket,
  Share2,
  TrendingUp,
  BarChart3,
  Eye,
  Globe,
  MessageCircle,
  CheckCircle,
} from 'lucide-vue-next'

definePageMeta({ layout: false })

useHead({
  title: 'WeDance — For festival organizers',
  meta: [
    { name: 'description', content: 'Ticket your festival where the dancers are. Planning tools, partner matching, real faces on every event page.' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Caveat:wght@400;700&display=swap' },
  ],
})

const features = [
  { icon: CalendarDays, title: 'Interactive schedule', description: 'Dancers browse workshops, filter by style and level, and build a plan — excitement builds weeks before the doors open.', color: '#dc2626' },
  { icon: Users,        title: 'Partner matching',    description: 'Leads and follows find each other before the festival. More matched partners = more workshop sign-ups.',              color: '#0891b2' },
  { icon: Heart,        title: 'Discover dancers',    description: 'Swipe to find dance partners. Mutual matches become a dance list — your attendees arrive already connected.',        color: '#a855f7' },
  { icon: Ticket,       title: 'Smart ticket picks',  description: 'As dancers add workshops to their plan, we suggest the best-value ticket. Your pass tiers, their perfect fit.',       color: '#f59e0b' },
  { icon: Share2,       title: 'Plan sharing',        description: 'Dancers share their festival plan with friends. Every share is a personalized invitation with your event front and centre.', color: '#16a34a' },
  { icon: TrendingUp,   title: 'Year planning',       description: 'Dancers plan their whole festival year on WeDance. Get discovered by dancers looking for their next event.',            color: '#dc2626' },
]

const insights = [
  { icon: BarChart3,     title: 'Workshop demand',      description: 'See which workshops are trending before you finalize the schedule. Add capacity where demand is highest.' },
  { icon: Eye,           title: 'Style & level mix',    description: 'Understand the real skill distribution of your attendees. Balance beginner-friendly and advanced content.' },
  { icon: Globe,         title: 'Audience geography',   description: 'Know where your dancers are travelling from. Partner with local hotels and give targeted travel tips.' },
  { icon: MessageCircle, title: 'Post-festival signal', description: 'Mutual dance endorsements and ratings give you honest feedback on teacher quality and workshop satisfaction.' },
]

const pricing = [
  {
    name: 'Starter',
    price: 'Free',
    description: 'Get listed and let dancers find you.',
    features: [
      'Festival listing with schedule',
      'Lineup with teacher profiles',
      'Venue info & directions',
      'Basic attendee count',
      'Link to your ticket page',
    ],
    cta: 'Get started',
    highlighted: false,
    color: '#0891b2',
  },
  {
    name: 'Pro',
    price: '€49',
    period: '/event',
    description: 'The full engagement toolkit.',
    features: [
      'Everything in Starter',
      'Interactive workshop planner',
      'Smart ticket recommendations',
      'Partner matching for attendees',
      'Plan sharing & referral tracking',
      'Workshop demand analytics',
      'Audience insights dashboard',
      'Priority support',
    ],
    cta: 'Start free trial',
    highlighted: true,
    color: '#dc2626',
  },
  {
    name: 'Network',
    price: '€199',
    period: '/year',
    description: 'For organizers running multiple events.',
    features: [
      'Everything in Pro',
      'Unlimited events per year',
      'Cross-event audience insights',
      'Featured in Year Planner',
      'Early access to new features',
      'Dedicated account manager',
    ],
    cta: 'Talk to us',
    highlighted: false,
    color: '#16a34a',
  },
]

const howItWorks = [
  { step: '1', title: 'List your event',       description: 'Add your festival, schedule, teachers, and venue in minutes.',                    color: '#dc2626' },
  { step: '2', title: 'Dancers plan',          description: 'Dancers find your event, build workshop plans, and match with partners.',        color: '#f59e0b' },
  { step: '3', title: 'Plans drive tickets',   description: 'Smart recommendations guide dancers to the right pass. Sharing spreads the word.', color: '#16a34a' },
  { step: '4', title: 'You get insights',      description: 'Real demand data, audience geography, and post-event signal.',                   color: '#0891b2' },
]

const router = useRouter()

function goToEditor() {
  router.push('/organizers/create')
}
</script>

<template>
  <div class="min-h-screen" style="background:#fbf5ea; color:#3b1f0d; font-family:'Playfair Display', serif;">
    <!-- Header — same as homepage -->
    <SiteHeader />

    <!-- HERO -->
    <section class="relative">
      <div class="max-w-6xl mx-auto px-4 pt-14 pb-16 text-center md:text-left">
        <div class="text-sm tracking-widest uppercase mb-3" style="color:#9a5614;">
          For festival organizers
        </div>
        <div class="grid md:grid-cols-12 gap-10 items-center">
          <div class="md:col-span-8">
            <h1 class="text-5xl sm:text-6xl leading-[0.98]" style="color:#3b1f0d;">
              Your dancers are<br>
              already <em class="italic" style="color:#dc2626;">planning.</em><br>
              <span style="font-family:'Caveat', cursive; color:#16a34a; font-size:0.9em;">Give them the tools.</span>
            </h1>
            <p class="mt-6 text-base sm:text-lg leading-relaxed max-w-xl mx-auto md:mx-0" style="color:#5b3a1d;">
              Ticket your festival where the dancers are.
              <span style="color:#3b1f0d;">Workshop planner, partner matching, real faces on every event page.</span>
            </p>
            <div class="mt-8 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
              <button
                type="button"
                class="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider"
                style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow: 0 4px 0 -1px #b91c1c;"
                @click="goToEditor"
              >
                List your festival <ArrowRight class="w-4 h-4" />
              </button>
              <NuxtLink
                to="/festivals/meneate-viena-2026"
                class="inline-flex items-center gap-2 text-sm italic hover:underline"
                style="color:#0891b2; font-family:'Caveat', cursive; font-size:20px;"
              >
                — see a live example
              </NuxtLink>
            </div>
          </div>

          <!-- Poster card — hint of the platform -->
          <div class="md:col-span-4 relative">
            <div class="absolute -top-4 -left-3 w-16 h-4 rotate-[-6deg]" style="background:#fef3c7; box-shadow:0 2px 6px rgba(0,0,0,0.15);"/>
            <div class="absolute -top-4 -right-3 w-16 h-4 rotate-[5deg]" style="background:#fef3c7; box-shadow:0 2px 6px rgba(0,0,0,0.15);"/>
            <div class="rounded-2xl overflow-hidden shadow-2xl border-4 bg-white"
                 style="border-color:#fbf5ea; box-shadow: 8px 10px 0 -2px #0891b2;">
              <div class="p-5" style="background:linear-gradient(135deg,#7c3aed 0%, #c026d3 50%, #f43f5e 100%);">
                <div class="text-[10px] uppercase tracking-[0.3em] text-white/90 font-bold">Live festival page</div>
                <div class="mt-1 text-2xl leading-tight text-white" style="font-family:'Playfair Display', serif;">
                  Your festival<br>on WeDance
                </div>
              </div>
              <div class="p-4">
                <div class="text-[10px] uppercase tracking-[0.25em] font-bold mb-3" style="color:#9a5614;">
                  What dancers see
                </div>
                <ul class="space-y-1.5 text-xs" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                  <li class="flex items-center gap-2"><CheckCircle class="w-3.5 h-3.5" style="color:#16a34a;"/> Real attendee faces</li>
                  <li class="flex items-center gap-2"><CheckCircle class="w-3.5 h-3.5" style="color:#16a34a;"/> Workshop planner</li>
                  <li class="flex items-center gap-2"><CheckCircle class="w-3.5 h-3.5" style="color:#16a34a;"/> Partner matching</li>
                  <li class="flex items-center gap-2"><CheckCircle class="w-3.5 h-3.5" style="color:#16a34a;"/> One-tap checkout</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Wave divider -->
      <svg class="block w-full h-12" viewBox="0 0 1440 60" preserveAspectRatio="none">
        <path d="M0,40 Q360,0 720,30 T1440,20 V60 H0 Z" fill="#3b1f0d" opacity="0.08"/>
      </svg>
    </section>

    <!-- HOW IT WORKS -->
    <section class="max-w-5xl mx-auto px-4 py-16">
      <div class="text-center mb-12">
        <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">Four steps</div>
        <h2 class="mt-3 text-3xl sm:text-4xl leading-tight">
          From listing to <em class="italic" style="color:#dc2626;">insights.</em>
        </h2>
      </div>

      <div class="grid md:grid-cols-4 gap-5">
        <div v-for="item in howItWorks" :key="item.step"
          class="relative rounded-2xl bg-white p-5 border"
          :style="{ borderColor: item.color + '55', boxShadow: '0 1px 0 ' + item.color + '22, 0 8px 20px rgba(59,31,18,0.05)' }">
          <div class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shadow-md mb-3"
               :style="{ background: item.color }">
            {{ item.step }}
          </div>
          <div class="text-base font-bold leading-tight" style="color:#3b1f0d;">{{ item.title }}</div>
          <div class="mt-2 text-sm leading-relaxed" style="color:#5b3a1d; font-family: system-ui, sans-serif;">{{ item.description }}</div>
        </div>
      </div>
    </section>

    <!-- FEATURES -->
    <section class="border-y" style="border-color:#3b1f0d22; background:rgba(251, 245, 234, 0.5);">
      <div class="max-w-5xl mx-auto px-4 py-16">
        <div class="text-center mb-12">
          <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">The toolkit</div>
          <h2 class="mt-3 text-3xl sm:text-4xl leading-tight">
            Everything <em class="italic" style="color:#dc2626;">your dancers</em> need.
          </h2>
          <p class="mt-3 text-sm sm:text-base max-w-xl mx-auto" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
            Tools that turn browsers into ticket buyers.
          </p>
        </div>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div v-for="feature in features" :key="feature.title"
            class="rounded-2xl bg-white p-6 border transition-all hover:-translate-y-1"
            :style="{ borderColor: feature.color + '55', boxShadow: '0 1px 0 ' + feature.color + '22, 0 8px 20px rgba(59,31,18,0.05)' }">
            <component :is="feature.icon" class="w-7 h-7 mb-3" :style="{ color: feature.color, 'stroke-width': 1.5 }" />
            <div class="text-lg font-bold leading-tight" style="color:#3b1f0d;">{{ feature.title }}</div>
            <div class="mt-2 text-sm leading-relaxed" style="color:#5b3a1d; font-family: system-ui, sans-serif;">{{ feature.description }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- INSIGHTS -->
    <section class="max-w-5xl mx-auto px-4 py-16">
      <div class="text-center mb-12">
        <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">The dashboard</div>
        <h2 class="mt-3 text-3xl sm:text-4xl leading-tight">
          Insights that shape <em class="italic" style="color:#dc2626;">your next event.</em>
        </h2>
        <p class="mt-3 text-sm sm:text-base max-w-xl mx-auto" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
          Real data from real planning behaviour.
        </p>
      </div>

      <div class="grid md:grid-cols-2 gap-5">
        <div v-for="insight in insights" :key="insight.title"
          class="rounded-2xl bg-white p-6 border flex gap-4 items-start"
          style="border-color:#3b1f0d22;">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
               style="background:#f59e0b18;">
            <component :is="insight.icon" class="w-5 h-5" style="color:#f59e0b; stroke-width:1.5;" />
          </div>
          <div>
            <div class="text-lg font-bold leading-tight" style="color:#3b1f0d;">{{ insight.title }}</div>
            <div class="mt-2 text-sm leading-relaxed" style="color:#5b3a1d; font-family: system-ui, sans-serif;">{{ insight.description }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- PRICING -->
    <section class="border-y" style="border-color:#3b1f0d22; background:rgba(251, 245, 234, 0.5);">
      <div class="max-w-5xl mx-auto px-4 py-16">
        <div class="text-center mb-12">
          <div class="text-xs uppercase tracking-[0.3em]" style="color:#9a5614;">Pricing</div>
          <h2 class="mt-3 text-3xl sm:text-4xl leading-tight">
            Start free.
            <span style="font-family:'Caveat', cursive; color:#dc2626; font-size:0.95em;">Upgrade when it works.</span>
          </h2>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
          <div v-for="plan in pricing" :key="plan.name"
            class="relative rounded-2xl bg-white p-6 border transition-all"
            :class="plan.highlighted ? 'md:-translate-y-2' : ''"
            :style="{ borderColor: plan.color + (plan.highlighted ? '' : '55'), borderWidth: plan.highlighted ? '2px' : '1px', boxShadow: plan.highlighted ? '8px 10px 0 -2px ' + plan.color + ', 0 12px 28px rgba(59,31,18,0.10)' : '0 1px 0 ' + plan.color + '22, 0 8px 20px rgba(59,31,18,0.05)' }">
            <div v-if="plan.highlighted"
              class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-white text-[10px] font-bold uppercase tracking-widest rounded-full"
              :style="{ background: plan.color }">
              Most popular
            </div>
            <div class="text-lg font-bold" style="color:#3b1f0d;">{{ plan.name }}</div>
            <div class="mt-2 mb-1 flex items-baseline gap-1">
              <span class="text-4xl font-bold" :style="{ color: plan.color }">{{ plan.price }}</span>
              <span v-if="plan.period" class="text-sm" style="color:#9a5614;">{{ plan.period }}</span>
            </div>
            <p class="text-sm mb-5" style="color:#5b3a1d; font-family: system-ui, sans-serif;">{{ plan.description }}</p>

            <ul class="space-y-2 mb-6">
              <li v-for="f in plan.features" :key="f" class="flex items-start gap-2 text-sm" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
                <CheckCircle class="w-4 h-4 shrink-0 mt-0.5" :style="{ color: plan.color }" />
                <span>{{ f }}</span>
              </li>
            </ul>

            <button
              type="button"
              class="w-full py-3 rounded-full text-sm font-bold uppercase tracking-wider transition-all"
              :style="plan.highlighted
                ? { background: 'linear-gradient(135deg, ' + plan.color + ', #f97316)', color: 'white', boxShadow: '0 4px 0 -1px ' + plan.color }
                : { border: '2px solid ' + plan.color, color: plan.color, background: 'white' }"
              @click="goToEditor"
            >
              {{ plan.cta }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- FINAL CTA -->
    <section class="max-w-3xl mx-auto px-4 py-20 text-center">
      <h2 class="text-4xl sm:text-5xl leading-tight">
        Ready to fill
        <em class="italic" style="color:#dc2626;">your dance floor?</em>
      </h2>
      <p class="mt-5 text-sm sm:text-base" style="color:#5b3a1d; font-family: system-ui, sans-serif;">
        List your festival in minutes. Your dancers will thank you.
      </p>
      <button
        type="button"
        class="mt-8 inline-flex items-center gap-2 px-7 py-3 rounded-full text-white text-sm font-bold uppercase tracking-wider"
        style="background:linear-gradient(135deg, #dc2626, #f97316); box-shadow: 0 4px 0 -1px #b91c1c;"
        @click="goToEditor"
      >
        Get started free <ArrowRight class="w-4 h-4" />
      </button>
      <div class="mt-3 text-sm" style="font-family:'Caveat', cursive; color:#9a5614;">
        — free to list, free to browse
      </div>
    </section>

    <SiteFooter />
  </div>
</template>
