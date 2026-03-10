import { defineConfig } from 'vite'

export default defineConfig({
  base: '/SketchPop/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  root: 'src',
})
