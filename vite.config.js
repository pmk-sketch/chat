import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 깃허브 저장소 이름인 /chat/을 기본 경로로 설정합니다.
  base: '/chat/', 
})
