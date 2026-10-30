import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '~': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
    rollupOptions: {
      output: {
        // three は観賞ページの lazy チャンクからだけ参照される。
        // ここで独立チャンクにしておくと、three 以外のコード変更ではキャッシュが効き続ける。
        manualChunks: {
          three: ['three'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  server: {
    port: 8080,
    strictPort: false,
    open: false,
  },
  preview: {
    port: 8080,
  },
});
