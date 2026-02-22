import { createClient } from '@supabase/supabase-js'

export default defineNuxtPlugin({
  name: 'supabase-client',
  setup() {
    const config = useRuntimeConfig()
    const supabaseUrl = config.public.supabaseUrl
    const supabaseAnonKey = config.public.supabaseAnonKey

    if (!supabaseUrl || !supabaseAnonKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Supabase runtime config is missing',
        message:
          'Set NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY in Netlify, then redeploy.'
      })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
