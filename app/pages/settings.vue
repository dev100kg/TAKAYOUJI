<script setup lang="ts">
import type { DailyEntryRow, QuestionSection, RecoveryLogRow, SettingsRow } from '~/types/models'
import {
  normalizeQuestionsEnabled,
  normalizeQuestionsSkipHoliday,
  QUESTION_DEFINITIONS,
  SECTION_LABELS
} from '~/utils/questions'

definePageMeta({
  middleware: ['auth']
})

const auth = useAuth()
const settingsApi = useSettings()
const supabase = useSupabaseClient()

const loading = ref(true)
const saving = ref(false)
const importing = ref(false)
const resetting = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')

const nightStart = ref('20:00')
const nightEnd = ref('06:00')
const recoveryMenu = ref<string[]>([])
const questionsEnabled = ref<Record<string, boolean>>({})
const questionsSkipHoliday = ref<Record<string, boolean>>({})
const newRecoveryItem = ref('')
const importJson = ref('')
const resetConfirmText = ref('')

const RESET_CONFIRM_PHRASE = 'RESET'
const QUESTION_SECTIONS: QuestionSection[] = ['A', 'B', 'C', 'D', 'E', 'F']

const groupedQuestions = computed(() => {
  return QUESTION_SECTIONS.map((sectionId) => {
    const questions = QUESTION_DEFINITIONS.filter((question) => question.section === sectionId)
    return {
      sectionId,
      sectionTitle: SECTION_LABELS[sectionId],
      questions,
      questionIds: questions.map((question) => question.id)
    }
  })
})

function setSectionQuestionsEnabled(questionIds: string[], enabled: boolean) {
  for (const id of questionIds) {
    questionsEnabled.value[id] = enabled
  }
}

function setSectionQuestionsSkipHoliday(questionIds: string[], skip: boolean) {
  for (const id of questionIds) {
    questionsSkipHoliday.value[id] = skip
  }
}

function isSectionAllEnabled(questionIds: string[]) {
  return questionIds.every((id) => questionsEnabled.value[id])
}

function isSectionAllSkipHoliday(questionIds: string[]) {
  return questionIds.every((id) => questionsSkipHoliday.value[id])
}

function hydrateSettings(settings: SettingsRow | null) {
  if (!settings) {
    return
  }

  nightStart.value = settings.night_start
  nightEnd.value = settings.night_end
  recoveryMenu.value = [...(settings.recovery_menu ?? [])]
  questionsEnabled.value = normalizeQuestionsEnabled(settings.questions_enabled)
  questionsSkipHoliday.value = normalizeQuestionsSkipHoliday(settings.questions_skip_holiday)
}

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    await auth.init()
    const settings = await settingsApi.ensureSettings()
    hydrateSettings(settings)
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '設定の読み込みに失敗しました。'
  }
  finally {
    loading.value = false
  }
}

function addRecoveryItem() {
  const value = newRecoveryItem.value.trim()
  if (!value) {
    return
  }

  if (!recoveryMenu.value.includes(value)) {
    recoveryMenu.value.push(value)
  }

  newRecoveryItem.value = ''
}

function removeRecoveryItem(name: string) {
  recoveryMenu.value = recoveryMenu.value.filter((item) => item !== name)
}

async function save() {
  saving.value = true
  errorMessage.value = ''
  infoMessage.value = ''

  try {
    await settingsApi.updateSettings({
      night_start: nightStart.value,
      night_end: nightEnd.value,
      recovery_menu: recoveryMenu.value,
      questions_enabled: questionsEnabled.value,
      questions_skip_holiday: questionsSkipHoliday.value
    })

    infoMessage.value = '設定を保存しました。'
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '設定の保存に失敗しました。'
  }
  finally {
    saving.value = false
  }
}

async function exportJson() {
  errorMessage.value = ''
  infoMessage.value = ''

  try {
    if (!auth.user.value) {
      throw new Error('認証情報が見つかりません。')
    }

    const userId = auth.user.value.id

    const [settingsResult, entriesResult, recoveryResult] = await Promise.all([
      supabase.from('settings').select('*').eq('user_id', userId).maybeSingle<SettingsRow>(),
      supabase
        .from('daily_entries')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true })
        .returns<DailyEntryRow[]>(),
      supabase
        .from('recovery_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true })
        .returns<RecoveryLogRow[]>()
    ])

    if (settingsResult.error) {
      throw settingsResult.error
    }
    if (entriesResult.error) {
      throw entriesResult.error
    }
    if (recoveryResult.error) {
      throw recoveryResult.error
    }

    const payload = {
      version: 1,
      exported_at: new Date().toISOString(),
      data: {
        settings: settingsResult.data,
        daily_entries: entriesResult.data ?? [],
        recovery_logs: recoveryResult.data ?? []
      }
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    })

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `takayouji-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)

    infoMessage.value = 'JSONをエクスポートしました。'
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'エクスポートに失敗しました。'
  }
}

async function importFromJson() {
  importing.value = true
  errorMessage.value = ''
  infoMessage.value = ''

  try {
    if (!auth.user.value) {
      throw new Error('認証情報が見つかりません。')
    }

    const parsed = JSON.parse(importJson.value)
    const data = parsed?.data
    if (!data) {
      throw new Error('JSONの形式が不正です。dataが見つかりません。')
    }

    const userId = auth.user.value.id

    if (data.settings) {
      const base = data.settings as Partial<SettingsRow>
      await supabase.from('settings').upsert(
        {
          user_id: userId,
          night_start: base.night_start ?? '20:00',
          night_end: base.night_end ?? '06:00',
          recovery_menu: Array.isArray(base.recovery_menu) ? base.recovery_menu : [],
          questions_enabled: normalizeQuestionsEnabled(base.questions_enabled),
          questions_skip_holiday: normalizeQuestionsSkipHoliday(base.questions_skip_holiday),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      )
    }

    if (Array.isArray(data.daily_entries) && data.daily_entries.length) {
      const payload = data.daily_entries.map((entry: Partial<DailyEntryRow>) => ({
        user_id: userId,
        date: entry.date,
        is_night: entry.is_night ?? false,
        answers: entry.answers ?? {},
        normalized: entry.normalized ?? {},
        facts: entry.facts ?? null,
        feelings: entry.feelings ?? null,
        actions: entry.actions ?? null,
        flags: entry.flags ?? {},
        suggestions: entry.suggestions ?? [],
        updated_at: new Date().toISOString()
      }))

      await supabase.from('daily_entries').upsert(payload, { onConflict: 'user_id,date' })
    }

    if (Array.isArray(data.recovery_logs) && data.recovery_logs.length) {
      const payload = data.recovery_logs.map((log: Partial<RecoveryLogRow>) => ({
        user_id: userId,
        date: log.date,
        items: Array.isArray(log.items) ? log.items : [],
        updated_at: new Date().toISOString()
      }))

      await supabase.from('recovery_logs').upsert(payload, { onConflict: 'user_id,date' })
    }

    importJson.value = ''
    infoMessage.value = 'JSONをインポートしました。'
    await load()
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'インポートに失敗しました。'
  }
  finally {
    importing.value = false
  }
}

async function resetAllData() {
  resetting.value = true
  errorMessage.value = ''
  infoMessage.value = ''

  try {
    if (!auth.user.value) {
      throw new Error('認証情報が見つかりません。')
    }

    if (resetConfirmText.value.trim() !== RESET_CONFIRM_PHRASE) {
      throw new Error(`確認文字列として ${RESET_CONFIRM_PHRASE} を入力してください。`)
    }

    const confirmed = window.confirm('あなたの全データを削除し、初期状態で作り直します。実行しますか？')
    if (!confirmed) {
      return
    }

    const userId = auth.user.value.id

    const [entriesDeleteResult, recoveryDeleteResult, settingsDeleteResult] = await Promise.all([
      supabase.from('daily_entries').delete().eq('user_id', userId),
      supabase.from('recovery_logs').delete().eq('user_id', userId),
      supabase.from('settings').delete().eq('user_id', userId)
    ])

    if (entriesDeleteResult.error) {
      throw entriesDeleteResult.error
    }
    if (recoveryDeleteResult.error) {
      throw recoveryDeleteResult.error
    }
    if (settingsDeleteResult.error) {
      throw settingsDeleteResult.error
    }

    await settingsApi.fetchSettings(true)
    const settings = await settingsApi.ensureSettings()
    hydrateSettings(settings)
    importJson.value = ''
    resetConfirmText.value = ''

    infoMessage.value = 'データを初期化しました。'
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'データの初期化に失敗しました。'
  }
  finally {
    resetting.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="space-y-4">
    <div class="card px-5 py-4">
      <h2 class="text-xl font-semibold text-emerald-950">設定</h2>
      <p class="mt-2 text-sm text-emerald-900/80">回収メニュー、質問表示、夜判定時間を調整します。</p>
    </div>

    <div v-if="loading" class="card px-5 py-4 text-sm text-emerald-900/80">
      読み込み中...
    </div>

    <template v-else>
      <div v-if="errorMessage" class="card border-orange-300 bg-orange-50 px-5 py-4 text-sm text-orange-800">
        {{ errorMessage }}
      </div>

      <div v-if="infoMessage" class="card border-emerald-300 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
        {{ infoMessage }}
      </div>

      <article class="card px-5 py-4">
        <h3 class="text-lg font-semibold text-emerald-950">夜判定</h3>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="label">開始時刻</span>
            <input v-model="nightStart" class="input mt-1" type="time">
          </label>
          <label class="block">
            <span class="label">終了時刻</span>
            <input v-model="nightEnd" class="input mt-1" type="time">
          </label>
        </div>
      </article>

      <article class="card px-5 py-4">
        <h3 class="text-lg font-semibold text-emerald-950">回収メニュー</h3>

        <div class="mt-3 flex flex-wrap gap-2">
          <input
            v-model="newRecoveryItem"
            class="input max-w-xs"
            type="text"
            placeholder="項目を追加"
          >
          <button type="button" class="btn-secondary" @click="addRecoveryItem">
            追加
          </button>
        </div>

        <ul class="mt-3 flex flex-wrap gap-2">
          <li
            v-for="item in recoveryMenu"
            :key="item"
            class="inline-flex items-center gap-2 rounded-full border border-emerald-900/20 bg-white px-3 py-1 text-sm"
          >
            {{ item }}
            <button
              type="button"
              class="rounded-full bg-emerald-900/10 px-2 py-0.5 text-xs text-emerald-900 hover:bg-emerald-900/20"
              @click="removeRecoveryItem(item)"
            >
              削除
            </button>
          </li>
        </ul>
      </article>

      <article class="card px-5 py-4">
        <h3 class="text-lg font-semibold text-emerald-950">質問設定</h3>
        <p class="mt-2 text-sm text-emerald-900/80">
          表示可否と土日祝に自動で外す対象を、A〜Fごとに一括設定できます。
        </p>

        <div class="mt-3 space-y-4">
          <div
            v-for="group in groupedQuestions"
            :key="group.sectionId"
            class="rounded-xl border border-emerald-900/10 bg-white/90 p-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="font-medium text-emerald-950">
                {{ group.sectionId }}. {{ group.sectionTitle }}
              </p>
              <div class="flex flex-wrap gap-1 text-xs">
                <button
                  type="button"
                  class="rounded-lg border border-emerald-900/15 bg-emerald-50 px-2 py-1 text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
                  :disabled="isSectionAllEnabled(group.questionIds)"
                  @click="setSectionQuestionsEnabled(group.questionIds, true)"
                >
                  表示: 全てON
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-emerald-900/15 bg-white px-2 py-1 text-emerald-900 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-45"
                  :disabled="!group.questionIds.some((id) => questionsEnabled[id])"
                  @click="setSectionQuestionsEnabled(group.questionIds, false)"
                >
                  表示: 全てOFF
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-emerald-900/15 bg-emerald-50 px-2 py-1 text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
                  :disabled="isSectionAllSkipHoliday(group.questionIds)"
                  @click="setSectionQuestionsSkipHoliday(group.questionIds, true)"
                >
                  土日祝除外: 全てON
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-emerald-900/15 bg-white px-2 py-1 text-emerald-900 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-45"
                  :disabled="!group.questionIds.some((id) => questionsSkipHoliday[id])"
                  @click="setSectionQuestionsSkipHoliday(group.questionIds, false)"
                >
                  土日祝除外: 全てOFF
                </button>
              </div>
            </div>
            <div class="mt-2 space-y-2">
              <div
                v-for="question in group.questions"
                :key="question.id"
                class="grid gap-2 rounded-lg border border-emerald-900/10 px-3 py-2 text-sm text-emerald-900 sm:grid-cols-[1fr_auto_auto]"
              >
                <span>{{ question.id }}. {{ question.label }}</span>

                <label class="inline-flex items-center gap-2 whitespace-nowrap">
                  <input
                    v-model="questionsEnabled[question.id]"
                    type="checkbox"
                  >
                  表示
                </label>

                <label class="inline-flex items-center gap-2 whitespace-nowrap">
                  <input
                    v-model="questionsSkipHoliday[question.id]"
                    type="checkbox"
                    :disabled="!questionsEnabled[question.id]"
                  >
                  土日祝は聞かない
                </label>
              </div>
            </div>
          </div>
        </div>
      </article>

      <article class="card px-5 py-4">
        <h3 class="text-lg font-semibold text-emerald-950">JSON Export / Import</h3>

        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" class="btn-secondary" @click="exportJson">
            エクスポート
          </button>
        </div>

        <label class="mt-4 block">
          <span class="label">インポート用JSON</span>
          <textarea
            v-model="importJson"
            class="input mt-1 min-h-40"
            placeholder="ここにJSONを貼り付け"
          />
        </label>

        <button
          type="button"
          class="btn-danger mt-3"
          :disabled="!importJson.trim() || importing"
          @click="importFromJson"
        >
          {{ importing ? 'インポート中...' : 'インポートを実行' }}
        </button>
      </article>

      <article class="card border-orange-300 bg-orange-50 px-5 py-4">
        <h3 class="text-lg font-semibold text-orange-900">データ初期化</h3>
        <p class="mt-2 text-sm text-orange-900/90">
          あなたの設定・日次ログ・回収ログを全削除し、設定を初期状態で再作成します。
        </p>

        <label class="mt-3 block">
          <span class="label text-orange-900">確認文字列</span>
          <input
            v-model="resetConfirmText"
            class="input mt-1 max-w-xs"
            type="text"
            :placeholder="`実行するには ${RESET_CONFIRM_PHRASE} を入力`"
          >
        </label>

        <button
          type="button"
          class="btn-danger mt-3"
          :disabled="resetConfirmText.trim() !== RESET_CONFIRM_PHRASE || resetting"
          @click="resetAllData"
        >
          {{ resetting ? '初期化中...' : '全データを初期化する' }}
        </button>
      </article>

      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn-primary" :disabled="saving" @click="save">
          {{ saving ? '保存中...' : '設定を保存' }}
        </button>
        <NuxtLink class="btn-secondary" to="/">
          ホームへ
        </NuxtLink>
      </div>
    </template>
  </section>
</template>
