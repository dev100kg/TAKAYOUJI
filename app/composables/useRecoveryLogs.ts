import type { RecoveryItem, RecoveryLogRow } from '~/types/models'

export function useRecoveryLogs() {
  const supabase = useSupabaseClient()
  const auth = useAuth()

  async function getLogByDate(date: string) {
    const user = auth.user.value
    if (!user) {
      return null
    }

    const { data, error } = await supabase
      .from('recovery_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .maybeSingle<RecoveryLogRow>()

    if (error) {
      throw error
    }

    return data
  }

  async function saveLog(date: string, items: RecoveryItem[]) {
    const user = auth.user.value
    if (!user) {
      throw new Error('認証が必要です')
    }

    const { data, error } = await supabase
      .from('recovery_logs')
      .upsert(
        {
          user_id: user.id,
          date,
          items,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id,date' }
      )
      .select('*')
      .single<RecoveryLogRow>()

    if (error) {
      throw error
    }

    return data
  }

  async function listSince(dateFrom: string) {
    const user = auth.user.value
    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from('recovery_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', dateFrom)
      .order('date', { ascending: false })
      .returns<RecoveryLogRow[]>()

    if (error) {
      throw error
    }

    return data ?? []
  }

  return {
    getLogByDate,
    saveLog,
    listSince
  }
}
