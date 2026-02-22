<script setup lang="ts">
import type { DailyEntryRow } from '~/types/models'

definePageMeta({
  middleware: ['auth']
})

const entriesApi = useDailyEntries()

const loading = ref(true)
const errorMessage = ref('')
const entries = ref<DailyEntryRow[]>([])

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    entries.value = await entriesApi.listRecent(90)
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'ログの取得に失敗しました。'
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
      <h2 class="text-xl font-semibold text-emerald-950">ログ一覧</h2>
      <p class="mt-2 text-sm text-emerald-900/80">日付ごとの記録と提案を確認できます。</p>
    </div>

    <div v-if="loading" class="card px-5 py-4 text-sm text-emerald-900/80">
      読み込み中...
    </div>

    <template v-else>
      <div v-if="errorMessage" class="card border-orange-300 bg-orange-50 px-5 py-4 text-sm text-orange-800">
        {{ errorMessage }}
      </div>

      <ul v-if="entries.length" class="space-y-2">
        <li
          v-for="entry in entries"
          :key="entry.id"
          class="card flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <div>
            <p class="font-medium text-emerald-950">
              {{ entry.date }}
            </p>
            <p class="text-xs text-emerald-900/75">
              提案 {{ entry.suggestions?.length ?? 0 }}件 / フラグ
              {{ Object.values(entry.flags ?? {}).filter(Boolean).length }}件
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <NuxtLink class="btn-secondary" :to="`/result/${entry.date}`">
              結果
            </NuxtLink>
            <NuxtLink class="btn-primary" :to="`/history/${entry.id}`">
              詳細
            </NuxtLink>
          </div>
        </li>
      </ul>

      <p v-else class="card px-5 py-4 text-sm text-emerald-900/80">
        ログはまだありません。
      </p>
    </template>
  </section>
</template>
