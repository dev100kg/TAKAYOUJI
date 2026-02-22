export type InputType = 'boolean' | 'likert5' | 'select'

export type QuestionSection = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export type RecoveryStatus = 'none' | 'planned' | 'done'

export interface SelectOption {
  value: string
  label: string
  normalized: number
}

export interface QuestionDefinition {
  id: string
  section: QuestionSection
  label: string
  inputType: InputType
  options?: SelectOption[]
}

export interface SettingsRow {
  id: string
  user_id: string
  night_start: string
  night_end: string
  recovery_menu: string[]
  questions_enabled: Record<string, boolean>
  questions_skip_holiday: Record<string, boolean>
  created_at: string
  updated_at: string
}

export interface DailyEntryRow {
  id: string
  user_id: string
  date: string
  is_night: boolean
  answers: Record<string, unknown>
  normalized: Record<string, unknown>
  facts: string | null
  feelings: string | null
  actions: string | null
  flags: FlagSet
  suggestions: string[]
  created_at: string
  updated_at: string
}

export interface RecoveryItem {
  name: string
  status: RecoveryStatus
  note: string
}

export interface RecoveryLogRow {
  id: string
  user_id: string
  date: string
  items: RecoveryItem[]
  created_at: string
  updated_at: string
}

export interface FlagSet {
  emotionUnlabeled: boolean
  trustToneRisk: boolean
  hoarding: boolean
  rushedConclusion: boolean
  unstableAxis: boolean
}
