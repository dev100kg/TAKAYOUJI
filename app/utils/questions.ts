import type { QuestionDefinition } from '~/types/models'

export const SECTION_LABELS: Record<string, string> = {
  A: '感情と所作',
  B: '役割と信頼',
  C: '型と余裕',
  D: '判断の品位',
  E: '重心',
  F: '最終姿勢'
}

export const QUESTION_DEFINITIONS: QuestionDefinition[] = [
  { id: 'A1', section: 'A', inputType: 'boolean', label: '感情を静かに言葉にした' },
  { id: 'A2', section: 'A', inputType: 'likert5', label: '落ち着いた所作で動いた' },
  { id: 'A3', section: 'A', inputType: 'boolean', label: '自分で選んで動いた' },

  { id: 'B1', section: 'B', inputType: 'likert5', label: '役割にふさわしく動いた' },
  { id: 'B2', section: 'B', inputType: 'likert5', label: '信頼を優先して動いた' },
  { id: 'B3', section: 'B', inputType: 'boolean', label: '事実を確かめて動いた' },
  { id: 'B4', section: 'B', inputType: 'boolean', label: '言葉の品位を保った' },

  { id: 'C1', section: 'C', inputType: 'boolean', label: '型を崩さなかった' },
  {
    id: 'C2',
    section: 'C',
    inputType: 'select',
    label: '回復の間を置いた',
    options: [
      { value: 'none', label: '置かなかった', normalized: 0 },
      { value: 'short', label: '少し置いた', normalized: 0.5 },
      { value: 'scheduled', label: '予定にした', normalized: 1 }
    ]
  },
  { id: 'C3', section: 'C', inputType: 'boolean', label: '抱え込まなかった' },

  { id: 'D1', section: 'D', inputType: 'boolean', label: '事実だけ記した' },
  { id: 'D2', section: 'D', inputType: 'boolean', label: '推測と分けた' },
  {
    id: 'D3',
    section: 'D',
    inputType: 'select',
    label: '結論を急がなかった',
    options: [
      { value: 'fixed', label: '急いだ', normalized: 0 },
      { value: 'held', label: '保留した', normalized: 0.75 },
      { value: 'asked', label: '吟味した', normalized: 1 }
    ]
  },

  { id: 'E1', section: 'E', inputType: 'likert5', label: '軸を自分に戻した' },
  { id: 'E2', section: 'E', inputType: 'likert5', label: '重心を分散した' },
  { id: 'E3', section: 'E', inputType: 'boolean', label: '足場を整えた' },

  { id: 'F1', section: 'F', inputType: 'boolean', label: '感情を静かに扱った' },
  { id: 'F2', section: 'F', inputType: 'likert5', label: '一貫した姿勢でいた' },
  { id: 'F3', section: 'F', inputType: 'boolean', label: '今宵はここまで' }
]

export const DEFAULT_RECOVERY_MENU = [
  'サウナ',
  'プログラミング',
  '文章',
  '睡眠',
  '運動',
  '誰かに話す',
  'その他'
]

function buildQuestionBooleanMap(defaultValue: boolean) {
  return Object.fromEntries(QUESTION_DEFINITIONS.map((question) => [question.id, defaultValue]))
}

function normalizeQuestionBooleanMap(
  map: Record<string, unknown> | null | undefined,
  defaultValue: boolean
) {
  return Object.fromEntries(
    QUESTION_DEFINITIONS.map((question) => {
      const value = map?.[question.id]
      return [question.id, typeof value === 'boolean' ? value : defaultValue]
    })
  )
}

export function buildDefaultQuestionsEnabled() {
  return buildQuestionBooleanMap(true)
}

export function buildDefaultQuestionsSkipHoliday() {
  return buildQuestionBooleanMap(false)
}

export function normalizeQuestionsEnabled(map: Record<string, unknown> | null | undefined) {
  return normalizeQuestionBooleanMap(map, true)
}

export function normalizeQuestionsSkipHoliday(map: Record<string, unknown> | null | undefined) {
  return normalizeQuestionBooleanMap(map, false)
}
