import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Azure Static Web Apps 需要
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
    proxy: {
      // 代理所有 /api 开头的请求到后端
      // 本地开发时使用 Azure 后端（后端已部署在云端）
      '/api': {
        target: 'https://toutiao-func-dev-d2bdehe8d5b6gbf5.canadacentral-01.azurewebsites.net',
        changeOrigin: true,
        secure: true,
      }
    }
  }
})
