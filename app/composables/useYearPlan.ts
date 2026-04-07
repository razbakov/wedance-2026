const yearPlanIds = ref(new Set<string>())
const yearDrawerOpen = ref(false)

export function useYearPlan() {
  function addFestival(slug: string) {
    const next = new Set(yearPlanIds.value)
    next.add(slug)
    yearPlanIds.value = next
  }

  function removeFestival(slug: string) {
    const next = new Set(yearPlanIds.value)
    next.delete(slug)
    yearPlanIds.value = next
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
  }
}
