import { onPlanChanged } from '~/lib/planChanged'

export default defineNuxtPlugin({
  name: 'plan',
  dependsOn: ['auth'],
  setup(nuxtApp) {
    const { isSignedIn } = useAuth()
    const yearPlan = useYearPlan()
    const weekPlan = useWeekPlan()
    const planCounts = usePlanCounts()

    function load() {
      yearPlan.loadFromDb()
      weekPlan.loadFromDb()
      planCounts.refresh()
    }

    // The badge / "in your week" counts follow every plan change (RAZ-889).
    onPlanChanged(() => {
      if (isSignedIn.value) planCounts.refresh()
    })

    // Load only once hydration is done. The server renders without the
    // dancer's plan, so filling it before hydrating made the client's first
    // render differ ("Going!" vs "Going?", the header's plan badge) and Vue
    // logged "Hydration completed but contains mismatches".
    nuxtApp.hooks.hookOnce('app:suspense:resolve', () => {
      if (isSignedIn.value) load()
      watch(isSignedIn, (signedIn) => {
        if (signedIn) load()
        else planCounts.reset()
      })
    })
  },
})
