const weekPlanIds = ref(new Set<string>())
const weekDrawerOpen = ref(false)

export function useWeekPlan() {
  function addEvent(id: string) {
    const next = new Set(weekPlanIds.value)
    next.add(id)
    weekPlanIds.value = next
    // CUJ: "Find a class" — Going! on a class/social (fires from any surface).
    useTrack().track('week_plan_add', { event_id: id, week_count: next.size })
  }

  function removeEvent(id: string) {
    const next = new Set(weekPlanIds.value)
    next.delete(id)
    weekPlanIds.value = next
  }

  function toggleEvent(id: string) {
    if (weekPlanIds.value.has(id)) {
      removeEvent(id)
    } else {
      addEvent(id)
    }
  }

  function toggleDrawer() {
    weekDrawerOpen.value = !weekDrawerOpen.value
  }

  function openDrawer() {
    weekDrawerOpen.value = true
  }

  function closeDrawer() {
    weekDrawerOpen.value = false
  }

  return {
    weekPlanIds: readonly(weekPlanIds),
    weekDrawerOpen: readonly(weekDrawerOpen),
    weekCount: computed(() => weekPlanIds.value.size),
    addEvent,
    removeEvent,
    toggleEvent,
    toggleDrawer,
    openDrawer,
    closeDrawer,
  }
}
