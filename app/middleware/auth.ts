const PUBLIC_PATHS = new Set(['/login'])

export default defineNuxtRouteMiddleware(async (to) => {
  if (process.server) {
    return
  }

  if (PUBLIC_PATHS.has(to.path) || to.path.startsWith('/auth/callback')) {
    return
  }

  const auth = useAuth()
  if (!auth.initialized.value) {
    await auth.init()
  }

  if (!auth.user.value) {
    return navigateTo('/login')
  }
})
