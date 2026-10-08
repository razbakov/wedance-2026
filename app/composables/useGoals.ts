export interface Goal {
  id: string
  title: string
  why: string
  progress: number
}

const goals = ref<Goal[]>([])
const loaded = ref(false)

export function useGoals() {
  async function loadFromDb() {
    const { $trpc } = useNuxtApp()
    try {
      const rows = await $trpc.plan.listDetailed.query()
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
    } catch (err) {
      console.error('[useGoals] loadFromDb failed:', err)
    } finally {
      loaded.value = true
    }
  }

  function hasGoal(title: string): boolean {
    const t = title.trim().toLowerCase()
    return goals.value.some(g => g.title.trim().toLowerCase() === t)
  }

  async function addGoal(title: string, why: string) {
    const id = `goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const goal: Goal = { id, title, why, progress: 0 }
    goals.value.push(goal)

    try {
      const { $trpc } = useNuxtApp()
      await $trpc.plan.add.mutate({
        itemType: 'goal',
        itemId: id,
        metadata: { title, why, progress: '0' },
      })
    } catch (err) {
      console.error('[useGoals] addGoal failed — rolling back:', err)
      goals.value = goals.value.filter(g => g.id !== id)
    }
  }

  async function removeGoal(id: string) {
    const removed = goals.value.find(g => g.id === id)
    goals.value = goals.value.filter(g => g.id !== id)

    try {
      const { $trpc } = useNuxtApp()
      await $trpc.plan.remove.mutate({ itemType: 'goal', itemId: id })
    } catch (err) {
      console.error('[useGoals] removeGoal failed — restoring:', err)
      if (removed) goals.value.push(removed)
    }
  }

  return {
    goals: readonly(goals),
    goalsLoaded: readonly(loaded),
    loadFromDb,
    hasGoal,
    addGoal,
    removeGoal,
  }
}
