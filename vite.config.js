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
      // 代理所有 /api 开头的请求到本地后端（本地开发时连接 toutiao_backend）
      // 切回云端请改为: target: 'https://toutiao-func-dev-xxx.azurewebsites.net'
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
