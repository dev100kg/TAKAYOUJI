<script setup lang="ts">
import type { DailyEntryRow, FlagSet } from '~/types/models'
import { QUESTION_DEFINITIONS, SECTION_LABELS } from '~/utils/questions'
import { calculateSectionAverages, computeOverallScore } from '~/utils/scoring'

definePageMeta({
  middleware: ['auth']
})

const route = useRoute()
const entriesApi = useDailyEntries()

const loading = ref(true)
const errorMessage = ref('')
const entry = ref<DailyEntryRow | null>(null)

const flagLabels: Record<keyof FlagSet, string> = {
  emotionUnlabeled: '感情の未言語化',
  trustToneRisk: '言葉の品位リスク',
  hoarding: '回収の未計画',
  rushedConclusion: '結論を急いだ',
  unstableAxis: '重心の不安定'
}

const sectionAverages = computed(() => {
  if (!entry.value) {
    return {}
  }

  const normalized = entry.value.normalized as Record<string, unknown>
  const stored = normalized._sectionAverages
  if (stored && typeof stored === 'object') {
    return stored as Record<string, number>
  }

  return calculateSectionAverages(QUESTION_DEFINITIONS, normalized)
})

const overallScore = computed(() => {
  if (!entry.value) {
    return 0
  }

  const normalized = entry.value.normalized as Record<string, unknown>
  const stored = Number(normalized._overall)
  if (!Number.isNaN(stored) && stored >= 0) {
    return stored
  }

  return computeOverallScore(sectionAverages.value)
})

const activeFlags = computed(() => {
  const flags = (entry.value?.flags ?? {}) as Partial<FlagSet>
  return Object.entries(flagLabels)
    .filter(([key]) => flags[key as keyof FlagSet])
    .map(([key, label]) => ({ key, label }))
})

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    const date = String(route.params.date)
    const result = await entriesApi.getEntryByDate(date)
    entry.value = result

    if (!result) {
      errorMessage.value = '対象日のログが見つかりませんでした。'
    }
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '読み込みに失敗しました。'
  }
  finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="space-y-4">
    <div class="card px-5 py-4">
      <h2 class="text-xl font-semibold text-emerald-950">結果（{{ route.params.date }}）</h2>
      <p class="mt-2 text-sm text-emerald-900/80">
        スコアは参考値です。明日の「次の一手」を優先して選びます。
      </p>
    </div>

    <div v-if="loading" class="card px-5 py-4 text-sm text-emerald-900/80">
      読み込み中...
    </div>

    <template v-else>
      <div v-if="errorMessage" class="card border-orange-300 bg-orange-50 px-5 py-4 text-sm text-orange-800">
        {{ errorMessage }}
      </div>

      <template v-if="entry">
        <article class="card px-5 py-4">
          <h3 class="text-lg font-semibold text-emerald-950">総合スコア</h3>
          <p class="mt-2 text-3xl font-bold text-emerald-900">
            {{ Math.round(overallScore * 100) }}
          </p>
          <p class="mt-1 text-xs text-emerald-900/70">0〜100換算</p>
        </article>

        <article class="card px-5 py-4">
          <h3 class="text-lg font-semibold text-emerald-950">セクション別</h3>
          <ul class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <li
              v-for="(score, sectionId) in sectionAverages"
              :key="sectionId"
              class="rounded-xl border border-emerald-900/10 bg-white/90 px-3 py-2"
            >
              <p class="text-sm text-emerald-900/75">
                {{ sectionId }}. {{ SECTION_LABELS[String(sectionId)] }}
              </p>
              <p class="text-lg font-semibold text-emerald-950">
                {{ Math.round(Number(score) * 100) }}
              </p>
            </li>
          </ul>
        </article>

        <article class="card px-5 py-4">
          <h3 class="text-lg font-semibold text-emerald-950">危険フラグ</h3>
          <ul v-if="activeFlags.length" class="mt-3 space-y-2">
            <li
              v-for="flag in activeFlags"
              :key="flag.key"
              class="rounded-xl border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-900"
            >
              {{ flag.label }}
            </li>
          </ul>
          <p v-else class="mt-3 text-sm text-emerald-900/80">
            フラグは検出されませんでした。
          </p>
        </article>

        <article class="card px-5 py-4">
          <h3 class="text-lg font-semibold text-emerald-950">次の一手</h3>
          <ol class="mt-3 list-inside list-decimal space-y-2 text-sm text-emerald-950">
            <li v-for="suggestion in entry.suggestions" :key="suggestion">
              {{ suggestion }}
            </li>
          </ol>
        </article>

        <article class="card px-5 py-4">
          <h3 class="text-lg font-semibold text-emerald-950">記述メモ</h3>
          <div class="mt-3 grid gap-3 md:grid-cols-3">
            <div class="rounded-xl border border-emerald-900/10 bg-white/90 p-3">
              <p class="label">facts</p>
              <p class="mt-1 whitespace-pre-wrap text-sm text-emerald-950">
                {{ entry.facts || '未記入' }}
              </p>
            </div>
            <div class="rounded-xl border border-emerald-900/10 bg-white/90 p-3">
              <p class="label">feelings</p>
              <p class="mt-1 whitespace-pre-wrap text-sm text-emerald-950">
                {{ entry.feelings || '未記入' }}
              </p>
            </div>
            <div class="rounded-xl border border-emerald-900/10 bg-white/90 p-3">
              <p class="label">actions</p>
              <p class="mt-1 whitespace-pre-wrap text-sm text-emerald-950">
                {{ entry.actions || '未記入' }}
              </p>
            </div>
          </div>
        </article>
      </template>

      <div class="flex flex-wrap gap-2">
        <NuxtLink class="btn-primary" to="/check">
          今日のチェックへ
        </NuxtLink>
        <NuxtLink class="btn-secondary" to="/logs">
          ログ一覧へ
        </NuxtLink>
      </div>
    </template>
  </section>
</template>
