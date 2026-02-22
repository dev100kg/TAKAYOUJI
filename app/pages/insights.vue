<script setup lang="ts">
import type { DailyEntryRow, FlagSet, RecoveryLogRow } from '~/types/models'
import { daysAgoDateString } from '~/utils/date'
import { QUESTION_DEFINITIONS, SECTION_LABELS } from '~/utils/questions'
import { calculateSectionAverages } from '~/utils/scoring'

definePageMeta({
  middleware: ['auth']
})

const entriesApi = useDailyEntries()
const recoveryApi = useRecoveryLogs()

const loading = ref(true)
const errorMessage = ref('')

const entries = ref<DailyEntryRow[]>([])
const recoveryLogs = ref<RecoveryLogRow[]>([])

const dateFrom = computed(() => daysAgoDateString(6))

const sectionAverages = computed(() => {
  const scoreBuckets: Record<string, number[]> = {}

  for (const entry of entries.value) {
    const normalized = entry.normalized as Record<string, unknown>
    const stored = normalized._sectionAverages
    const sectionMap =
      stored && typeof stored === 'object'
        ? (stored as Record<string, number>)
        : calculateSectionAverages(QUESTION_DEFINITIONS, normalized)

    for (const [section, score] of Object.entries(sectionMap)) {
      if (!scoreBuckets[section]) {
        scoreBuckets[section] = []
      }
      scoreBuckets[section].push(Number(score))
    }
  }

  return Object.fromEntries(
    Object.entries(scoreBuckets).map(([section, scores]) => {
      const total = scores.reduce((sum, score) => sum + score, 0)
      return [section, scores.length ? total / scores.length : 0]
    })
  )
})

const flagCounts = computed(() => {
  const counts: Record<keyof FlagSet, number> = {
    emotionUnlabeled: 0,
    trustToneRisk: 0,
    hoarding: 0,
    rushedConclusion: 0,
    unstableAxis: 0
  }

  for (const entry of entries.value) {
    const flags = entry.flags as Partial<FlagSet>
    for (const key of Object.keys(counts) as (keyof FlagSet)[]) {
      if (flags[key]) {
        counts[key] += 1
      }
    }
  }

  return counts
})

const recoveryRate = computed(() => {
  let done = 0
  let total = 0

  for (const log of recoveryLogs.value) {
    for (const item of log.items ?? []) {
      if (item.status !== 'none') {
        total += 1
      }
      if (item.status === 'done') {
        done += 1
      }
    }
  }

  return {
    done,
    total,
    ratio: total ? done / total : 0
  }
})

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    const allEntries = await entriesApi.listRecent(30)
    entries.value = allEntries.filter((entry) => entry.date >= dateFrom.value)
    recoveryLogs.value = await recoveryApi.listSince(dateFrom.value)
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '週次データの取得に失敗しました。'
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
      <h2 class="text-xl font-semibold text-emerald-950">週次インサイト</h2>
      <p class="mt-2 text-sm text-emerald-900/80">
        対象期間: {{ dateFrom }} 〜 今日
      </p>
    </div>

    <div v-if="loading" class="card px-5 py-4 text-sm text-emerald-900/80">
      読み込み中...
    </div>

    <template v-else>
      <div v-if="errorMessage" class="card border-orange-300 bg-orange-50 px-5 py-4 text-sm text-orange-800">
        {{ errorMessage }}
      </div>

      <article class="card px-5 py-4">
        <h3 class="text-lg font-semibold text-emerald-950">セクション平均</h3>

        <ul v-if="Object.keys(sectionAverages).length" class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <li
            v-for="(score, section) in sectionAverages"
            :key="section"
            class="rounded-xl border border-emerald-900/10 bg-white/90 px-3 py-2"
          >
            <p class="text-sm text-emerald-900/75">
              {{ section }}. {{ SECTION_LABELS[String(section)] }}
            </p>
            <p class="text-lg font-semibold text-emerald-950">
              {{ Math.round(Number(score) * 100) }}
            </p>
          </li>
        </ul>

        <p v-else class="mt-3 text-sm text-emerald-900/80">
          期間内データがありません。
        </p>
      </article>

      <article class="card px-5 py-4">
        <h3 class="text-lg font-semibold text-emerald-950">危険フラグ回数</h3>
        <ul class="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          <li class="rounded-xl border border-emerald-900/10 bg-white/90 px-3 py-2 text-sm">
            感情未言語化: {{ flagCounts.emotionUnlabeled }}回
          </li>
          <li class="rounded-xl border border-emerald-900/10 bg-white/90 px-3 py-2 text-sm">
            品位リスク: {{ flagCounts.trustToneRisk }}回
          </li>
          <li class="rounded-xl border border-emerald-900/10 bg-white/90 px-3 py-2 text-sm">
            回収未計画: {{ flagCounts.hoarding }}回
          </li>
          <li class="rounded-xl border border-emerald-900/10 bg-white/90 px-3 py-2 text-sm">
            結論急ぎ: {{ flagCounts.rushedConclusion }}回
          </li>
          <li class="rounded-xl border border-emerald-900/10 bg-white/90 px-3 py-2 text-sm">
            重心不安定: {{ flagCounts.unstableAxis }}回
          </li>
        </ul>
      </article>

      <article class="card px-5 py-4">
        <h3 class="text-lg font-semibold text-emerald-950">回収率</h3>
        <p class="mt-2 text-2xl font-bold text-emerald-900">
          {{ Math.round(recoveryRate.ratio * 100) }}%
        </p>
        <p class="mt-1 text-sm text-emerald-900/80">
          実施 {{ recoveryRate.done }} / 予定・実施 {{ recoveryRate.total }}
        </p>
      </article>
    </template>
  </section>
</template>
