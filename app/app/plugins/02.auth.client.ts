export default defineNuxtPlugin({
  name: 'auth',
  dependsOn: ['trpc'],
  async setup() {
    const { init } = useAuth()
    await init()
  },
})
