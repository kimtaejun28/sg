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
        // 원의 성질 학습 앱 (/circle.html)
        circle: fileURLToPath(new URL('./circle.html', import.meta.url)),
      },
    },
  },
})
