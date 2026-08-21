import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        // 구슬 레이스 룰렛 (/roulette.html)
        roulette: fileURLToPath(new URL('./roulette.html', import.meta.url)),
      },
    },
  },
})
