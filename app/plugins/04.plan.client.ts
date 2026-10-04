export default defineNuxtPlugin({
  name: 'plan',
  dependsOn: ['auth'],
  setup() {
    const { isSignedIn } = useAuth()
    const yearPlan = useYearPlan()
    const weekPlan = useWeekPlan()

    if (isSignedIn.value) {
      yearPlan.loadFromDb()
      weekPlan.loadFromDb()
    }

    watch(isSignedIn, (signedIn) => {
      if (signedIn) {
        yearPlan.loadFromDb()
        weekPlan.loadFromDb()
      }
    })
  },
})
