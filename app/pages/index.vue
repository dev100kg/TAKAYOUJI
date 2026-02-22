<script setup lang="ts">
import type { DailyEntryRow, RecoveryItem } from '~/types/models'
import { getLocalDateString } from '~/utils/date'

definePageMeta({
  middleware: ['auth']
})

const auth = useAuth()
const settingsApi = useSettings()
const entriesApi = useDailyEntries()
const recoveryApi = useRecoveryLogs()

const loading = ref(true)
const savingRecovery = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')

const today = getLocalDateString()

const todayEntry = ref<DailyEntryRow | null>(null)
const recentEntries = ref<DailyEntryRow[]>([])
const recoveryItems = ref<RecoveryItem[]>([])

const settings = computed(() => settingsApi.settings.value)

const recoveryProgress = computed(() => {
  if (!recoveryItems.value.length) {
    return { done: 0, planned: 0, total: 0 }
  }

  const done = recoveryItems.value.filter((item) => item.status === 'done').length
  const planned = recoveryItems.value.filter((item) => item.status === 'planned').length

  return {
    done,
    planned,
    total: recoveryItems.value.length
  }
})

function buildRecoveryItems(menu: string[], existingItems?: RecoveryItem[]) {
  const map = new Map((existingItems ?? []).map((item) => [item.name, item]))
  return menu.map((name) => {
    const existing = map.get(name)
    return {
      name,
      status: existing?.status ?? 'none',
      note: existing?.note ?? ''
    } satisfies RecoveryItem
  })
}

async function load() {
  loading.value = true
  errorMessage.value = ''

  try {
    await auth.init()
    const ensuredSettings = await settingsApi.ensureSettings()
    todayEntry.value = await entriesApi.getEntryByDate(today)
    recentEntries.value = await entriesApi.listRecent(7)

    const todayRecovery = await recoveryApi.getLogByDate(today)
    recoveryItems.value = buildRecoveryItems(
      ensuredSettings?.recovery_menu ?? [],
      todayRecovery?.items
    )
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '読み込みに失敗しました。'
  }
  finally {
    loading.value = false
  }
}

async function saveRecovery() {
  savingRecovery.value = true
  infoMessage.value = ''
  errorMessage.value = ''

  try {
    await recoveryApi.saveLog(today, recoveryItems.value)
    infoMessage.value = '回収ログを保存しました。'
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '回収ログの保存に失敗しました。'
  }
  finally {
    savingRecovery.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="space-y-5">
    <div v-if="loading" class="card px-5 py-4 text-sm text-emerald-900/80">
      読み込み中...
    </div>

    <template v-else>
      <div v-if="errorMessage" class="card border-orange-300 bg-orange-50 px-5 py-4 text-sm text-orange-800">
        {{ errorMessage }}
      </div>

      <div class="grid gap-4 lg:grid-cols-3">
        <article class="card px-5 py-4 lg:col-span-2">
          <h2 class="text-lg font-semibold text-emerald-950">今日の状態（{{ today }}）</h2>

          <p class="mt-2 text-sm text-emerald-900/80">
            {{
              todayEntry
                ? '今日のチェックは保存済みです。必要なら編集して更新できます。'
                : 'まだ今日のチェックがありません。1〜3分で記録できます。'
            }}
          </p>

          <div class="mt-4 flex flex-wrap gap-2">
            <NuxtLink class="btn-primary" to="/check">
              {{ todayEntry ? '今日のチェックを編集' : '今日のチェックを開始' }}
            </NuxtLink>
            <NuxtLink v-if="todayEntry" class="btn-secondary" :to="`/result/${today}`">
              結果を見る
            </NuxtLink>
          </div>
        </article>

        <article class="card px-5 py-4">
          <h2 class="text-lg font-semibold text-emerald-950">回収メーター</h2>
          <p class="mt-2 text-sm text-emerald-900/80">
            実施 {{ recoveryProgress.done }} / 予定 {{ recoveryProgress.planned }} / 全{{ recoveryProgress.total }}
          </p>
          <p class="mt-1 text-xs text-emerald-900/70">
            記録は当日分に上書き保存されます。
          </p>
        </article>
      </div>

      <article class="card px-5 py-4">
        <h2 class="text-lg font-semibold text-emerald-950">今日の回収</h2>

        <div v-if="!settings?.recovery_menu?.length" class="mt-3 text-sm text-emerald-900/75">
          回収メニューが未設定です。設定画面で追加してください。
        </div>

        <div v-else class="mt-3 space-y-3">
          <div
            v-for="item in recoveryItems"
            :key="item.name"
            class="rounded-xl border border-emerald-900/10 bg-white/90 p-3"
          >
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p class="font-medium text-emerald-950">
                {{ item.name }}
              </p>
              <select v-model="item.status" class="input max-w-xs">
                <option value="none">未着手</option>
                <option value="planned">予定</option>
                <option value="done">実施</option>
              </select>
            </div>
            <input
              v-model="item.note"
              class="input mt-2"
              type="text"
              :placeholder="`${item.name}のメモ（任意）`"
            >
          </div>

          <div class="flex items-center gap-3">
            <button type="button" class="btn-primary" :disabled="savingRecovery" @click="saveRecovery">
              {{ savingRecovery ? '保存中...' : '回収ログを保存' }}
            </button>
            <p v-if="infoMessage" class="text-sm text-emerald-900">
              {{ infoMessage }}
            </p>
          </div>
        </div>
      </article>

      <article class="card px-5 py-4">
        <h2 class="text-lg font-semibold text-emerald-950">直近ログ（7日）</h2>

        <ul v-if="recentEntries.length" class="mt-3 space-y-2">
          <li
            v-for="entry in recentEntries"
            :key="entry.id"
            class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-900/10 bg-white/90 px-3 py-2"
          >
            <div>
              <p class="font-medium text-emerald-950">
                {{ entry.date }}
              </p>
              <p class="text-xs text-emerald-900/70">
                提案 {{ entry.suggestions?.length ?? 0 }}件 / フラグ
                {{ Object.values(entry.flags ?? {}).filter(Boolean).length }}件
              </p>
            </div>
            <NuxtLink class="btn-secondary" :to="`/logs/${entry.id}`">
              詳細
            </NuxtLink>
          </li>
        </ul>

        <p v-else class="mt-3 text-sm text-emerald-900/80">
          まだログがありません。
        </p>
      </article>
    </template>
  </section>
</template>
