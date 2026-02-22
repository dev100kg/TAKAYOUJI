export function useSupabaseClient() {
  return useNuxtApp().$supabase
}
