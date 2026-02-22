<script setup lang="ts">
const route = useRoute()
const auth = useAuth()

const links = [
  { label: 'ホーム', to: '/' },
  { label: 'チェック', to: '/check' },
  { label: '履歴', to: '/history' },
  { label: '週次', to: '/insights' },
  { label: '設定', to: '/settings' }
]

const isPublicRoute = computed(() => route.path === '/login' || route.path.startsWith('/auth/callback'))
</script>

<template>
  <div class="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-10 pt-5 sm:px-6">
    <header class="card mb-6 px-4 py-3 sm:px-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-900/70">Daily Self Check</p>
          <h1 class="text-xl font-semibold text-emerald-950">武士は食わねど高楊枝</h1>
        </div>
        <button
          v-if="auth.user.value"
          type="button"
          class="btn-secondary"
          @click="auth.signOut"
        >
          ログアウト
        </button>
      </div>

      <nav v-if="!isPublicRoute" class="mt-4 flex flex-wrap gap-2">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="rounded-lg px-3 py-1.5 text-sm transition"
          :class="
            route.path === link.to
              ? 'bg-emerald-800 text-white'
              : 'border border-emerald-900/20 bg-white text-emerald-900 hover:bg-emerald-50'
          "
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
    </header>

    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>
