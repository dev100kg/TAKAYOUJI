export default defineNuxtPlugin({
  name: 'auth-bootstrap',
  dependsOn: ['supabase-client'],
  async setup() {
    const auth = useAuth()

    await auth.init()
    auth.attachAuthListener()
  }
})
