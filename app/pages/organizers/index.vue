<script setup lang="ts">
import {
  CalendarDays,
  Users,
  TrendingUp,
  BarChart3,
  Heart,
  Ticket,
  Share2,
  Globe,
  CheckCircle,
  ArrowRight,
  Zap,
  Star,
  MessageCircle,
  Eye,
} from 'lucide-vue-next'

useHead({
  title: 'For Organizers | WeDance',
  meta: [
    { name: 'description', content: 'List your dance festival on WeDance. Reach thousands of dancers, boost ticket sales, and build your community.' },
  ],
})

const stats = [
  { value: '12,000+', label: 'Active dancers' },
  { value: '180+', label: 'Festivals listed' },
  { value: '35', label: 'Countries' },
  { value: '92%', label: 'Return rate' },
]

const features = [
  {
    icon: CalendarDays,
    title: 'Interactive Schedule',
    description: 'Dancers browse your workshops, filter by style and level, and build a personal plan — driving excitement weeks before the event.',
  },
  {
    icon: Users,
    title: 'Partner Matching',
    description: 'Leads and follows find each other before the festival. More matched partners = more workshop sign-ups.',
  },
  {
    icon: Heart,
    title: 'Discover Dancers',
    description: 'Tinder-style swiping to find dance partners. Mutual matches build a dance list — your attendees arrive already connected.',
  },
  {
    icon: Ticket,
    title: 'Smart Ticket Recommendations',
    description: 'As dancers add workshops to their plan, we recommend the best-value ticket. Your pass options, their perfect fit.',
  },
  {
    icon: Share2,
    title: 'Viral Plan Sharing',
    description: 'Dancers share their festival plan with friends. Each share is a personalized invitation with your festival front and center.',
  },
  {
    icon: TrendingUp,
    title: 'Year Planning',
    description: 'Dancers plan their whole festival year on WeDance. Get discovered by dancers looking for their next event.',
  },
]

const insights = [
  {
    icon: BarChart3,
    title: 'Workshop Demand',
    description: 'See which workshops are trending before you finalize the schedule. Add capacity where demand is highest.',
  },
  {
    icon: Eye,
    title: 'Style & Level Mix',
    description: 'Understand the actual skill distribution of your attendees. Balance beginner-friendly and advanced content.',
  },
  {
    icon: Globe,
    title: 'Audience Geography',
    description: 'Know where your dancers are traveling from. Partner with local hotels and offer targeted travel tips.',
  },
  {
    icon: MessageCircle,
    title: 'Post-Festival Feedback',
    description: 'Mutual dance endorsements and ratings give you authentic signal on teacher quality and workshop satisfaction.',
  },
]

const testimonials = [
  {
    quote: 'We sold 40 more full passes this year. Dancers were sharing their plans and friends were signing up to join them.',
    name: 'Maria Gonzalez',
    role: 'Organizer, Salsa Open Berlin',
    photo: 'https://i.pravatar.cc/100?u=maria-org',
  },
  {
    quote: 'The workshop demand data changed how we plan. We added a second Timba room on Saturday because we could see the demand weeks ahead.',
    name: 'Klaus Weber',
    role: 'Organizer, Menéate Vienna',
    photo: 'https://i.pravatar.cc/100?u=klaus-org',
  },
  {
    quote: 'Our dancers told us they felt more connected before they even arrived. The partner matching is a game changer for couple workshops.',
    name: 'Addy Mendoza',
    role: 'Organizer, Cuban Fire Munich',
    photo: 'https://i.pravatar.cc/100?u=addy-org',
  },
]

const pricing = [
  {
    name: 'Starter',
    price: 'Free',
    description: 'Get listed and let dancers discover you',
    features: [
      'Festival listing with schedule',
      'Lineup with teacher profiles',
      'Venue info & directions',
      'Basic attendee count',
      'Link to your ticket page',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '€49',
    period: '/event',
    description: 'Full engagement toolkit for serious organizers',
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
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Network',
    price: '€199',
    period: '/year',
    description: 'For organizers running multiple events',
    features: [
      'Everything in Pro',
      'Unlimited events per year',
      'Cross-event audience insights',
      'Featured in Year Planner',
      'Early access to new features',
      'Dedicated account manager',
    ],
    cta: 'Contact Us',
    highlighted: false,
  },
]

const howItWorks = [
  { step: '1', title: 'List your event', description: 'Add your festival, schedule, teachers, and venue in minutes.' },
  { step: '2', title: 'Dancers discover & plan', description: 'Dancers find your event, build workshop plans, and match with partners.' },
  { step: '3', title: 'Plans drive ticket sales', description: 'Smart recommendations guide dancers to the right ticket. Sharing spreads the word.' },
  { step: '4', title: 'You get insights', description: 'See real demand data, audience demographics, and post-event feedback.' },
]

const router = useRouter()

function goToEditor() {
  router.push('/organizers/create')
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Hero -->
    <section class="relative overflow-hidden border-b">
      <div class="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
      <div class="relative max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
          <Zap class="w-3.5 h-3.5" />
          For Festival Organizers
        </div>

        <h1 class="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
          Your dancers are already planning.
          <br />
          <span class="text-primary">Give them the tools.</span>
        </h1>

        <p class="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          WeDance turns your festival page into an interactive planning experience.
          Dancers build workshop plans, find partners, and share with friends —
          driving ticket sales before the doors even open.
        </p>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <Button size="lg" class="gap-2 text-base px-8" @click="goToEditor()">
            List Your Festival
            <ArrowRight class="w-4 h-4" />
          </Button>
          <Button size="lg" variant="outline" class="gap-2 text-base" as="a" href="/festivals/meneate-viena-2026">
            See Live Example
          </Button>
        </div>

        <!-- Stats bar -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mt-14 pt-8 border-t">
          <div v-for="stat in stats" :key="stat.label" class="text-center">
            <div class="text-2xl md:text-3xl font-bold">{{ stat.value }}</div>
            <div class="text-xs text-muted-foreground mt-1">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="max-w-4xl mx-auto px-4 py-16">
      <h2 class="text-2xl font-bold text-center mb-2">How it works</h2>
      <p class="text-muted-foreground text-center mb-10">From listing to insights in four steps</p>

      <div class="grid md:grid-cols-4 gap-6">
        <div v-for="item in howItWorks" :key="item.step" class="text-center">
          <div class="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center mx-auto mb-3">
            {{ item.step }}
          </div>
          <h3 class="font-semibold text-sm mb-1">{{ item.title }}</h3>
          <p class="text-xs text-muted-foreground leading-relaxed">{{ item.description }}</p>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="border-y bg-muted/30">
      <div class="max-w-4xl mx-auto px-4 py-16">
        <h2 class="text-2xl font-bold text-center mb-2">Everything your dancers need</h2>
        <p class="text-muted-foreground text-center mb-10">Tools that turn browsers into ticket buyers</p>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="feature in features" :key="feature.title" class="rounded-lg border bg-background p-5">
              <div class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 mb-3">
                <component :is="feature.icon" class="w-5 h-5 text-primary" />
              </div>
              <h3 class="font-semibold text-sm mb-1">{{ feature.title }}</h3>
              <p class="text-xs text-muted-foreground leading-relaxed">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Insights -->
    <section class="max-w-4xl mx-auto px-4 py-16">
      <h2 class="text-2xl font-bold text-center mb-2">Insights that shape your next event</h2>
      <p class="text-muted-foreground text-center mb-10">Real data from real planning behavior</p>

      <div class="grid md:grid-cols-2 gap-6">
        <div v-for="insight in insights" :key="insight.title" class="flex gap-4 items-start">
          <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <component :is="insight.icon" class="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 class="font-semibold text-sm mb-1">{{ insight.title }}</h3>
            <p class="text-xs text-muted-foreground leading-relaxed">{{ insight.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Testimonials -->
    <section class="border-y bg-muted/30">
      <div class="max-w-4xl mx-auto px-4 py-16">
        <h2 class="text-2xl font-bold text-center mb-10">What organizers say</h2>

        <div class="grid md:grid-cols-3 gap-6">
          <Card v-for="t in testimonials" :key="t.name" class="border bg-background">
            <CardContent class="p-5">
              <div class="flex gap-1 mb-3">
                <Star v-for="i in 5" :key="i" class="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              </div>
              <p class="text-sm leading-relaxed mb-4 italic">"{{ t.quote }}"</p>
              <div class="flex items-center gap-3">
                <img :src="t.photo" :alt="t.name" class="w-9 h-9 rounded-full" />
                <div>
                  <div class="text-xs font-semibold">{{ t.name }}</div>
                  <div class="text-xs text-muted-foreground">{{ t.role }}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section class="max-w-4xl mx-auto px-4 py-16">
      <h2 class="text-2xl font-bold text-center mb-2">Simple, transparent pricing</h2>
      <p class="text-muted-foreground text-center mb-10">Start free. Upgrade when you see the value.</p>

      <div class="grid md:grid-cols-3 gap-6">
        <Card
          v-for="plan in pricing"
          :key="plan.name"
          class="border relative"
          :class="plan.highlighted ? 'border-primary shadow-lg ring-1 ring-primary' : ''"
        >
          <div
            v-if="plan.highlighted"
            class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full"
          >
            Most Popular
          </div>
          <CardContent class="p-5">
            <h3 class="font-semibold text-lg">{{ plan.name }}</h3>
            <div class="mt-2 mb-1">
              <span class="text-3xl font-bold">{{ plan.price }}</span>
              <span v-if="plan.period" class="text-sm text-muted-foreground">{{ plan.period }}</span>
            </div>
            <p class="text-xs text-muted-foreground mb-4">{{ plan.description }}</p>

            <ul class="space-y-2 mb-6">
              <li v-for="f in plan.features" :key="f" class="flex items-start gap-2 text-xs">
                <CheckCircle class="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                {{ f }}
              </li>
            </ul>

            <Button
              class="w-full"
              :variant="plan.highlighted ? 'default' : 'outline'"
              @click="goToEditor()"
            >
              {{ plan.cta }}
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>

    <!-- CTA -->
    <section class="border-t">
      <div class="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 class="text-2xl font-bold mb-2">Ready to fill your dance floor?</h2>
        <p class="text-muted-foreground mb-6">List your festival in minutes. Your dancers will thank you.</p>
        <Button size="lg" class="gap-2 text-base px-8" @click="goToEditor()">
          Get Started Free
          <ArrowRight class="w-4 h-4" />
        </Button>
      </div>
    </section>

  </div>
</template>
