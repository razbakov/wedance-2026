export interface Goal {
  id: string
  title: string
  why: string
  progress: number
}

const goals = ref<Goal[]>([])
const loaded = ref(false)

export function useGoals() {
  function loadFromDb() {
    const { $trpc } = useNuxtApp()
    $trpc.plan.list
      .query()
      .then((rows) => {
        const dbGoals: Goal[] = []
        for (const r of rows) {
          if (r.itemType === 'goal' && r.metadata) {
            dbGoals.push({
              id: r.itemId,
              title: (r.metadata as Record<string, string>).title || '',
              why: (r.metadata as Record<string, string>).why || '',
              progress: Number((r.metadata as Record<string, string>).progress) || 0,
            })
          }
        }
        goals.value = dbGoals
        loaded.value = true
      })
      .catch(() => {
        loaded.value = true
      })
  }

  function addGoal(title: string, why: string) {
    const id = `goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const goal: Goal = { id, title, why, progress: 0 }
    goals.value.push(goal)

    const { $trpc } = useNuxtApp()
    $trpc.plan.add
      .mutate({
        itemType: 'goal',
        itemId: id,
        metadata: { title, why, progress: '0' },
      })
      .catch(() => {})
  }

  function removeGoal(id: string) {
    goals.value = goals.value.filter(g => g.id !== id)
    const { $trpc } = useNuxtApp()
    $trpc.plan.remove
      .mutate({ itemType: 'goal', itemId: id })
      .catch(() => {})
  }

  return {
    goals: readonly(goals),
    goalsLoaded: readonly(loaded),
    loadFromDb,
    addGoal,
    removeGoal,
  }
}
