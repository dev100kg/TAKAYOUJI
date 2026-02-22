import type { Session, User } from '@supabase/supabase-js'

interface AuthState {
  initialized: boolean
  session: Session | null
  user: User | null
}

export function useAuth() {
  const supabase = useSupabaseClient()
  const state = useState<AuthState>('auth-state', () => ({
    initialized: false,
    session: null,
    user: null
  }))
  const hasListener = useState<boolean>('auth-listener', () => false)

  async function init() {
    if (process.server || state.value.initialized) {
      return
    }

    const { data } = await supabase.auth.getSession()
    state.value.session = data.session
    state.value.user = data.session?.user ?? null
    state.value.initialized = true
  }

  function attachAuthListener() {
    if (process.server || hasListener.value) {
      return
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      state.value.session = session
      state.value.user = session?.user ?? null
      state.value.initialized = true
    })

    hasListener.value = true
  }

  async function signInWithGitHub() {
    if (process.server) {
      return
    }

    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    state.value.session = null
    state.value.user = null
    await navigateTo('/login')
  }

  return {
    initialized: computed(() => state.value.initialized),
    session: computed(() => state.value.session),
    user: computed(() => state.value.user),
    init,
    attachAuthListener,
    signInWithGitHub,
    signOut
  }
}
