<script setup lang="ts">
import type { DailyEntryRow, QuestionDefinition } from '~/types/models'
import { getLocalDateString, isNightTime, isWeekendOrHoliday, parseLocalDateString } from '~/utils/date'
import { QUESTION_DEFINITIONS, SECTION_LABELS } from '~/utils/questions'
import {
  calculateSectionAverages,
  computeOverallScore,
  detectFlags,
  generateSuggestions,
  normalizeAnswers
} from '~/utils/scoring'

definePageMeta({
  middleware: ['auth']
})

const auth = useAuth()
const settingsApi = useSettings()
const entriesApi = useDailyEntries()

const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')

const today = getLocalDateString()
const isWeekendHolidayToday = computed(() => isWeekendOrHoliday(parseLocalDateString(today)))

const answers = ref<Record<string, unknown>>({})
const facts = ref('')
const feelings = ref('')
const actions = ref('')

const settings = computed(() => settingsApi.settings.value)

const enabledQuestionIds = computed(() => {
  const map = settings.value?.questions_enabled ?? {}
  return new Set(Object.entries(map).filter(([, enabled]) => enabled).map(([id]) => id))
})

const skipOnHolidayQuestionIds = computed(() => {
  const map = settings.value?.questions_skip_holiday ?? {}
  return new Set(Object.entries(map).filter(([, enabled]) => enabled).map(([id]) => id))
})

const baseEnabledQuestions = computed(() => {
  const idSet = enabledQuestionIds.value
  return QUESTION_DEFINITIONS.filter((question) => idSet.has(question.id))
})

const skippedQuestionsToday = computed(() => {
  if (!isWeekendHolidayToday.value) {
    return []
  }

  const skipSet = skipOnHolidayQuestionIds.value
  return baseEnabledQuestions.value.filter((question) => skipSet.has(question.id))
})

const enabledQuestions = computed(() => {
  if (!isWeekendHolidayToday.value) {
    return baseEnabledQuestions.value
  }

  const skipSet = skipOnHolidayQuestionIds.value
  return baseEnabledQuestions.value.filter((question) => !skipSet.has(question.id))
})

const groupedQuestions = computed(() => {
  const sections = ['A', 'B', 'C', 'D', 'E', 'F']
  return sections
    .map((sectionId) => ({
      sectionId,
      sectionTitle: SECTION_LABELS[sectionId],
      questions: enabledQuestions.value.filter((question) => question.section === sectionId)
    }))
    .filter((section) => section.questions.length > 0)
})

function buildDefaultAnswers(questions: QuestionDefinition[]) {
  return Object.fromEntries(
    questions.map((question) => {
      if (question.inputType === 'boolean') {
        return [question.id, null]
      }
      if (question.inputType === 'likert5') {
        return [question.id, null]
      }
      return [question.id, null]
    })
  )
}

function hydrateEntry(entry: DailyEntryRow | null) {
  answers.value = buildDefaultAnswers(enabledQuestions.value)

  for (const question of enabledQuestions.value) {
    if (entry?.answers && Object.hasOwn(entry.answers, question.id)) {
      answers.value[question.id] = entry.answers[question.id]
    }
  }

  facts.value = entry?.facts ?? ''
  feelings.value = entry?.feelings ?? ''
  actions.value = entry?.actions ?? ''
}

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    await auth.init()
    await settingsApi.ensureSettings()

    const entry = await entriesApi.getEntryByDate(today)
    hydrateEntry(entry)
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '読み込みに失敗しました。'
  }
  finally {
    loading.value = false
  }
}

function validate() {
  for (const question of enabledQuestions.value) {
    const value = answers.value[question.id]
    if (value === null || value === undefined || value === '') {
      return `${question.id} に回答してください。`
    }
  }

  return ''
}

async function save() {
  const validationError = validate()
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  if (!auth.user.value || !settings.value) {
    errorMessage.value = '認証または設定情報を確認できませんでした。'
    return
  }

  saving.value = true
  errorMessage.value = ''

  try {
    const answerPayload = Object.fromEntries(
      enabledQuestions.value.map((question) => [question.id, answers.value[question.id]])
    )

    const normalized = normalizeAnswers(enabledQuestions.value, answerPayload)
    const sectionAverages = calculateSectionAverages(enabledQuestions.value, normalized)
    const overallScore = computeOverallScore(sectionAverages)
    const isNight = isNightTime(new Date(), settings.value.night_start, settings.value.night_end)

    const flags = detectFlags(answerPayload)
    const suggestions = generateSuggestions({
      flags,
      sectionAverages,
      answers: answerPayload
    })

    await entriesApi.saveEntry({
      user_id: auth.user.value.id,
      date: today,
      is_night: isNight,
      answers: answerPayload,
      normalized: {
        ...normalized,
        _sectionAverages: sectionAverages,
        _overall: overallScore
      },
      facts: facts.value.trim() || null,
      feelings: feelings.value.trim() || null,
      actions: actions.value.trim() || null,
      flags,
      suggestions
    })

    await navigateTo(`/result/${today}`)
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '保存に失敗しました。'
  }
  finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="space-y-4">
    <div class="card px-5 py-4">
      <h2 class="text-xl font-semibold text-emerald-950">
        今日のチェック（{{ today }}）
      </h2>
      <p class="mt-2 text-sm text-emerald-900/80">
        感情は否定せず、行動の選択だけを静かに点検します。
      </p>
    </div>

    <div v-if="loading" class="card px-5 py-4 text-sm text-emerald-900/80">
      読み込み中...
    </div>

    <template v-else>
      <div v-if="errorMessage" class="card border-orange-300 bg-orange-50 px-5 py-4 text-sm text-orange-800">
        {{ errorMessage }}
      </div>

      <div
        v-if="isWeekendHolidayToday && skippedQuestionsToday.length > 0"
        class="card border-sky-300 bg-sky-50 px-5 py-4 text-sm text-sky-900"
      >
        土日祝設定により、{{ skippedQuestionsToday.length }}件の質問を非表示にしています。
      </div>

      <article
        v-for="group in groupedQuestions"
        :key="group.sectionId"
        class="card px-5 py-4"
      >
        <h3 class="text-lg font-semibold text-emerald-950">
          {{ group.sectionId }}. {{ group.sectionTitle }}
        </h3>

        <div class="mt-4 space-y-4">
          <div
            v-for="question in group.questions"
            :key="question.id"
            class="rounded-xl border border-emerald-900/10 bg-white/90 p-3"
          >
            <p class="font-medium text-emerald-950">
              {{ question.id }}. {{ question.label }}
            </p>

            <div v-if="question.inputType === 'boolean'" class="mt-2 flex flex-wrap gap-4">
              <label class="flex items-center gap-2 text-sm">
                <input
                  v-model="answers[question.id]"
                  :name="question.id"
                  type="radio"
                  :value="true"
                >
                はい
              </label>
              <label class="flex items-center gap-2 text-sm">
                <input
                  v-model="answers[question.id]"
                  :name="question.id"
                  type="radio"
                  :value="false"
                >
                いいえ
              </label>
            </div>

            <div v-else-if="question.inputType === 'likert5'" class="mt-2">
              <select v-model="answers[question.id]" class="input max-w-xs">
                <option :value="null">選択してください</option>
                <option :value="1">1（まったくできなかった）</option>
                <option :value="2">2</option>
                <option :value="3">3</option>
                <option :value="4">4</option>
                <option :value="5">5（十分できた）</option>
              </select>
            </div>

            <div v-else class="mt-2">
              <select v-model="answers[question.id]" class="input max-w-sm">
                <option :value="null">選択してください</option>
                <option
                  v-for="option in question.options"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </article>

      <article class="card px-5 py-4">
        <h3 class="text-lg font-semibold text-emerald-950">自由記述（任意）</h3>

        <div class="mt-3 grid gap-3 md:grid-cols-3">
          <label class="block">
            <span class="label">facts（観測できる事実）</span>
            <textarea
              v-model="facts"
              class="input mt-1 min-h-28"
              placeholder="例: 11:00に進捗共有を送信した"
            />
          </label>

          <label class="block">
            <span class="label">feelings（感情）</span>
            <textarea
              v-model="feelings"
              class="input mt-1 min-h-28"
              placeholder="例: 焦り、疲れ"
            />
          </label>

          <label class="block">
            <span class="label">actions（選ぶ行動）</span>
            <textarea
              v-model="actions"
              class="input mt-1 min-h-28"
              placeholder="例: 朝一で確認項目を3つに絞る"
            />
          </label>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <button type="button" class="btn-primary" :disabled="saving" @click="save">
            {{ saving ? '保存中...' : '保存して結果を見る' }}
          </button>
          <NuxtLink class="btn-secondary" to="/">
            ホームに戻る
          </NuxtLink>
        </div>
      </article>
    </template>
  </section>
</template>
