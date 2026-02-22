export default defineNuxtPlugin(() => {
  if (!import.meta.client || !('serviceWorker' in navigator)) {
    return
  }

  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js')
    } catch (error) {
      console.error('[pwa] service worker registration failed', error)
    }
  })
})
