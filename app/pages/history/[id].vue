<script setup lang="ts">
import type { DailyEntryRow } from '~/types/models'
import { QUESTION_DEFINITIONS } from '~/utils/questions'

definePageMeta({
  middleware: ['auth']
})

const route = useRoute()
const entriesApi = useDailyEntries()

const loading = ref(true)
const errorMessage = ref('')
const entry = ref<DailyEntryRow | null>(null)

const answerRows = computed(() => {
  if (!entry.value) {
    return []
  }

  return QUESTION_DEFINITIONS.filter((question) => Object.prototype.hasOwnProperty.call(entry.value?.answers ?? {}, question.id)).map(
    (question) => ({
      id: question.id,
      label: question.label,
      answer: entry.value?.answers?.[question.id],
      normalized: Number(entry.value?.normalized?.[question.id] ?? 0)
    })
  )
})

function formatAnswer(value: unknown) {
  if (value === true) {
    return 'はい'
  }
  if (value === false) {
    return 'いいえ'
  }
  return String(value)
}

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    const id = String(route.params.id)
    entry.value = await entriesApi.getById(id)

    if (!entry.value) {
      errorMessage.value = 'ログが見つかりませんでした。'
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
      <h2 class="text-xl font-semibold text-emerald-950">ログ詳細</h2>
      <p class="mt-2 text-sm text-emerald-900/80">
        {{ entry?.date || '---' }} の記録
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
          <h3 class="text-lg font-semibold text-emerald-950">回答一覧</h3>
          <ul class="mt-3 space-y-2">
            <li
              v-for="row in answerRows"
              :key="row.id"
              class="rounded-xl border border-emerald-900/10 bg-white/90 px-3 py-2"
            >
              <p class="text-sm font-medium text-emerald-950">
                {{ row.id }}. {{ row.label }}
              </p>
              <p class="mt-1 text-sm text-emerald-900/80">
                回答: {{ formatAnswer(row.answer) }}
              </p>
              <p class="text-xs text-emerald-900/70">
                正規化: {{ Math.round(row.normalized * 100) }}
              </p>
            </li>
          </ul>
        </article>

        <article class="card px-5 py-4">
          <h3 class="text-lg font-semibold text-emerald-950">提案</h3>
          <ol class="mt-3 list-inside list-decimal space-y-2 text-sm text-emerald-950">
            <li v-for="suggestion in entry.suggestions" :key="suggestion">
              {{ suggestion }}
            </li>
          </ol>
        </article>
      </template>

      <div class="flex flex-wrap gap-2">
        <NuxtLink class="btn-secondary" to="/history">
          ログ一覧へ
        </NuxtLink>
        <NuxtLink v-if="entry" class="btn-primary" :to="`/result/${entry.date}`">
          結果画面へ
        </NuxtLink>
      </div>
    </template>
  </section>
</template>
