<script setup lang="ts">
/**
 * The signed-out landing. On the homepage (`surface="home"`) it is audience
 * tabs — Everyone, Artists, Organizers, Venues — each with its own callout
 * (RAZ-1095). Everyone is `/`; the others are `?tab=`, read in setup so SSR
 * matches the first paint. Signed-out `/my-plan` (`surface="my_plan_landing"`)
 * stays the dancer pitch: no tabs, no callout.
 *
 * `surface` also tags the ChatGPT button's `ai_app_cta_click` and the Meet
 * card's `meet_friends_opened`.
 */
import {
  LANDING_PANELS,
  LANDING_TAB_LABELS,
  landingTabFromQuery,
  landingTabQuery,
  showsLandingTabs,
  type LandingTab,
} from '~/lib/landingAudience'

const props = defineProps<{ surface: string }>()

const route = useRoute()
const router = useRouter()
const showTabs = computed(() => showsLandingTabs(props.surface))
const panels = Object.values(LANDING_PANELS)
const tab = ref<LandingTab>(showTabs.value ? landingTabFromQuery(route.query.tab).tab : 'everyone')
const tabsRef = ref<HTMLElement | null>(null)

const authAction = ref<'dashboard' | 'signin'>('dashboard')
const showAuth = ref(false)
function openAuth(action: 'dashboard' | 'signin') {
  authAction.value = action
  showAuth.value = true
}

function trackTab(next: LandingTab, via: 'nav' | 'link' | 'load') {
  useTrack().trackOnce(`${props.surface}:${next}`, 'landing_tab_opened', {
    tab: next,
    via,
    surface: props.surface,
  })
}

function syncQuery(next: LandingTab) {
  const current = Array.isArray(route.query.tab) ? route.query.tab[0] : route.query.tab
  const wanted = next === 'everyone' ? undefined : next
  if ((current || undefined) === wanted) return
  router.replace({
    query: landingTabQuery(route.query as Record<string, unknown>, next),
    hash: route.hash,
  })
}

function onTabUpdate(value: string | number) {
  const next = landingTabFromQuery(String(value)).tab
  if (next === tab.value) return
  tab.value = next
  syncQuery(next)
  trackTab(next, 'nav')
  // Same as an event's tabs: a click brings the tab back if the page was scrolled.
  nextTick(() => {
    const el = tabsRef.value
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' })
  })
}

watch(() => route.query.tab, (value) => {
  if (!showTabs.value) return
  const parsed = landingTabFromQuery(value)
  tab.value = parsed.tab
  if (parsed.replace) syncQuery('everyone')
})

onMounted(() => {
  if (!showTabs.value) return
  const parsed = landingTabFromQuery(route.query.tab)
  if (parsed.replace) syncQuery('everyone')
  trackTab(parsed.tab, parsed.via)
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 pb-10 pt-10">
    <Tabs
      v-if="showTabs"
      :model-value="tab"
      data-testid="landing-audience-tabs"
      @update:model-value="onTabUpdate"
    >
      <div ref="tabsRef" class="mb-8 flex justify-center font-sans">
        <TabsList aria-label="Who are you?" class="h-auto rounded-full p-1">
          <TabsTrigger
            v-for="item in LANDING_TAB_LABELS"
            :key="item.tab"
            :value="item.tab"
            class="rounded-full px-2.5 py-2 text-sm font-bold sm:px-4"
          >
            {{ item.label }}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="everyone" class="mt-0">
        <LandingDancerPitch :surface="surface" show-callout @auth="openAuth('dashboard')" />
      </TabsContent>
      <TabsContent v-for="panel in panels" :key="panel.tab" :value="panel.tab" class="mt-0">
        <LandingAudiencePanel :panel="panel" :surface="surface" />
      </TabsContent>
    </Tabs>

    <LandingDancerPitch v-else :surface="surface" @auth="openAuth('dashboard')" />

    <SignUpModal v-model:open="showAuth" :action="authAction" />
  </div>
</template>
