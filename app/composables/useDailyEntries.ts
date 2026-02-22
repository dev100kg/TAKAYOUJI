import type { DailyEntryRow } from '~/types/models'

export function useDailyEntries() {
  const supabase = useSupabaseClient()
  const auth = useAuth()

  async function getEntryByDate(date: string) {
    const user = auth.user.value
    if (!user) {
      return null
    }

    const { data, error } = await supabase
      .from('daily_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .maybeSingle<DailyEntryRow>()

    if (error) {
      throw error
    }

    return data
  }

  async function saveEntry(payload: Omit<DailyEntryRow, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('daily_entries')
      .upsert({ ...payload, updated_at: new Date().toISOString() }, { onConflict: 'user_id,date' })
      .select('*')
      .single<DailyEntryRow>()

    if (error) {
      throw error
    }

    return data
  }

  async function listRecent(limit = 14) {
    const user = auth.user.value
    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from('daily_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(limit)
      .returns<DailyEntryRow[]>()

    if (error) {
      throw error
    }

    return data ?? []
  }

  async function getById(id: string) {
    const user = auth.user.value
    if (!user) {
      return null
    }

    const { data, error } = await supabase
      .from('daily_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('id', id)
      .maybeSingle<DailyEntryRow>()

    if (error) {
      throw error
    }

    return data
  }

  return {
    getEntryByDate,
    saveEntry,
    listRecent,
    getById
  }
}
