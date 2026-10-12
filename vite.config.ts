import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // BỔ SUNG KHỐI SERVER NÀY VÀO TRONG FILE CỦA BẠN:
  server: {
    allowedHosts: true // Cho phép tất cả các host từ đường hầm Cloudflare truy cập vào
  }
})