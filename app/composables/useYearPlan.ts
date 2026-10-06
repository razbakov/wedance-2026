const yearPlanIds = ref(new Set<string>())
const yearDrawerOpen = ref(false)

export function useYearPlan() {
  function loadFromDb() {
    const { $trpc } = useNuxtApp()
    return $trpc.plan.list
      .query()
      .then((rows) => {
        const ids = new Set<string>()
        for (const r of rows) {
          if (r.itemType === 'festival') ids.add(r.itemId)
        }
        yearPlanIds.value = ids
      })
      .catch((err) => {
        console.warn('[useYearPlan] loadFromDb failed:', err)
      })
  }

  function addFestival(slug: string) {
    const next = new Set(yearPlanIds.value)
    next.add(slug)
    yearPlanIds.value = next
    // CUJ: "Plan a festival year" — festival added to the year plan.
    useTrack().track('year_plan_add', {
      festival_slug: slug,
      year_count: next.size,
    })
    const { $trpc } = useNuxtApp()
    $trpc.plan.add
      .mutate({ itemType: 'festival', itemId: slug })
      .catch((err) => {
        console.warn('[useYearPlan] addFestival failed:', err)
      })
  }

  function removeFestival(slug: string) {
    const next = new Set(yearPlanIds.value)
    next.delete(slug)
    yearPlanIds.value = next
    const { $trpc } = useNuxtApp()
    $trpc.plan.remove
      .mutate({ itemType: 'festival', itemId: slug })
      .catch((err) => {
        console.warn('[useYearPlan] removeFestival failed:', err)
      })
  }

  function toggleFestival(slug: string) {
    if (yearPlanIds.value.has(slug)) {
      removeFestival(slug)
    } else {
      addFestival(slug)
    }
  }

  function toggleDrawer() {
    yearDrawerOpen.value = !yearDrawerOpen.value
  }

  function openDrawer() {
    yearDrawerOpen.value = true
  }

  function closeDrawer() {
    yearDrawerOpen.value = false
  }

  return {
    yearPlanIds: readonly(yearPlanIds),
    yearDrawerOpen: readonly(yearDrawerOpen),
    yearCount: computed(() => yearPlanIds.value.size),
    addFestival,
    removeFestival,
    toggleFestival,
    toggleDrawer,
    openDrawer,
    closeDrawer,
    loadFromDb,
  }
}
