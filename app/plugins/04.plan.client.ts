export default defineNuxtPlugin({
  name: 'plan',
  dependsOn: ['auth'],
  async setup() {
    const { isSignedIn } = useAuth()
    const yearPlan = useYearPlan()
    const weekPlan = useWeekPlan()

    if (isSignedIn.value) {
      await Promise.all([yearPlan.loadFromDb(), weekPlan.loadFromDb()])
    }

    watch(isSignedIn, (signedIn) => {
      if (signedIn) {
        yearPlan.loadFromDb()
        weekPlan.loadFromDb()
      }
    })
  },
})
