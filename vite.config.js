import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Убираем хеши из имен файлов для Chrome Extension
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    // Отключаем минификацию для лучшей отладки в development
    minify: true,
    // Генерируем source maps
    sourcemap: true
  },
  // Настройки для Chrome Extension
  define: {
    global: 'globalThis',
  },
  server: {
    // Для разработки
    hmr: {
      port: 5174
    }
  }
})