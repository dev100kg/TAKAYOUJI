import type { SettingsRow } from '~/types/models'
import {
  buildDefaultQuestionsEnabled,
  buildDefaultQuestionsSkipHoliday,
  DEFAULT_RECOVERY_MENU,
  normalizeQuestionsEnabled,
  normalizeQuestionsSkipHoliday
} from '~/utils/questions'

export function useSettings() {
  const supabase = useSupabaseClient()
  const auth = useAuth()
  const settings = useState<SettingsRow | null>('app-settings', () => null)

  function normalizeSettingsRow(data: SettingsRow | null) {
    if (!data) {
      return null
    }

    return {
      ...data,
      recovery_menu: Array.isArray(data.recovery_menu) ? data.recovery_menu : DEFAULT_RECOVERY_MENU,
      questions_enabled: normalizeQuestionsEnabled(data.questions_enabled),
      questions_skip_holiday: normalizeQuestionsSkipHoliday(data.questions_skip_holiday)
    }
  }

  async function fetchSettings(force = false) {
    const user = auth.user.value
    if (!user) {
      settings.value = null
      return null
    }

    if (!force && settings.value) {
      return settings.value
    }

    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle<SettingsRow>()

    if (error) {
      throw error
    }

    const normalized = normalizeSettingsRow(data)
    settings.value = normalized
    return normalized
  }

  async function ensureSettings() {
    const user = auth.user.value
    if (!user) {
      return null
    }

    const existing = await fetchSettings(true)
    if (existing) {
      return existing
    }

    const payload = {
      user_id: user.id,
      night_start: '20:00',
      night_end: '06:00',
      recovery_menu: DEFAULT_RECOVERY_MENU,
      questions_enabled: buildDefaultQuestionsEnabled(),
      questions_skip_holiday: buildDefaultQuestionsSkipHoliday(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single<SettingsRow>()

    if (error) {
      throw error
    }

    const normalized = normalizeSettingsRow(data)
    settings.value = normalized
    return normalized
  }

  async function updateSettings(
    payload: Partial<Omit<SettingsRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ) {
    const user = auth.user.value
    if (!user) {
      throw new Error('認証が必要です')
    }

    const updatePayload = {
      ...payload,
      questions_enabled:
        payload.questions_enabled !== undefined
          ? normalizeQuestionsEnabled(payload.questions_enabled)
          : undefined,
      questions_skip_holiday:
        payload.questions_skip_holiday !== undefined
          ? normalizeQuestionsSkipHoliday(payload.questions_skip_holiday)
          : undefined,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('settings')
      .update(updatePayload)
      .eq('user_id', user.id)
      .select('*')
      .single<SettingsRow>()

    if (error) {
      throw error
    }

    const normalized = normalizeSettingsRow(data)
    settings.value = normalized
    return normalized
  }

  return {
    settings: computed(() => settings.value),
    fetchSettings,
    ensureSettings,
    updateSettings
  }
}
