import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// ตั้งค่า Vite สำหรับสร้าง Frontend ลงในโฟลเดอร์ dist/client พร้อมแยก Chunk ตามหมวดหมู่เพื่อเพิ่มความเร็วในการโหลด
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
      '/r2': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
});
