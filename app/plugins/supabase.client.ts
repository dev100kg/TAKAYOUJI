import { createClient } from '@supabase/supabase-js'

export default defineNuxtPlugin({
  name: 'supabase-client',
  setup() {
    const config = useRuntimeConfig()

    const supabase = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })

    return {
      provide: {
        supabase
      }
    }
  }
})
