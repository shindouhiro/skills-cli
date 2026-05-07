import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src/ui',
  base: './',
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => tag === 'iconify-icon',
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve('src/ui'),
      '~': path.resolve('src'),
    },
  },
  build: {
    outDir: '../../dist/ui',
    emptyOutDir: true,
    target: 'es2020',
  },
})
