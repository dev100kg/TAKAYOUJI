<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

const auth = useAuth()
const loading = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  await auth.init()
  if (auth.user.value) {
    await navigateTo('/')
  }
})

async function signIn() {
  loading.value = true
  errorMessage.value = ''

  try {
    await auth.signInWithGitHub()
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'ログインに失敗しました。'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-xl">
    <div class="card px-6 py-8 sm:px-8">
      <h2 class="text-2xl font-semibold text-emerald-950">ログイン</h2>
      <p class="mt-3 text-sm leading-relaxed text-emerald-900/80">
        GitHubアカウントでログインすると、今日のセルフチェックをすぐに開始できます。
      </p>

      <button type="button" class="btn-primary mt-6 w-full" :disabled="loading" @click="signIn">
        {{ loading ? 'リダイレクト中...' : 'GitHubでログイン' }}
      </button>

      <p v-if="errorMessage" class="mt-3 text-sm text-orange-800">
        {{ errorMessage }}
      </p>
    </div>
  </section>
</template>
