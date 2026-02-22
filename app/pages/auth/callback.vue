<script setup lang="ts">
const supabase = useSupabaseClient()
const auth = useAuth()
const message = ref('認証を確認しています...')

onMounted(async () => {
  try {
    const url = window.location.href
    const hasCode = new URL(url).searchParams.has('code')

    if (hasCode) {
      const { error } = await supabase.auth.exchangeCodeForSession(url)
      if (error) {
        throw error
      }
    }

    await auth.init()

    if (auth.user.value) {
      await navigateTo('/')
      return
    }

    message.value = 'ログイン情報を確認できませんでした。もう一度お試しください。'
  }
  catch (error) {
    message.value = error instanceof Error ? error.message : '認証処理でエラーが発生しました。'
  }
})
</script>

<template>
  <section class="mx-auto max-w-xl">
    <div class="card px-6 py-8 sm:px-8">
      <h2 class="text-xl font-semibold text-emerald-950">ログイン処理中</h2>
      <p class="mt-3 text-sm text-emerald-900/80">
        {{ message }}
      </p>
      <NuxtLink to="/login" class="btn-secondary mt-5">
        ログイン画面へ戻る
      </NuxtLink>
    </div>
  </section>
</template>
