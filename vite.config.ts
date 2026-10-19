import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react()
  ],
  
  // BỔ SUNG KHỐI SERVER NÀY VÀO TRONG FILE CỦA BẠN:
  server: {
    allowedHosts: true // Cho phép tất cả các host từ đường hầm Cloudflare truy cập vào
  }
})