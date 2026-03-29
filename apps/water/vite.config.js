import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: __dirname,
  envDir: path.resolve(__dirname, '../..'),
  plugins: [
    react(),
    tailwindcss(),
    visualizer({ open: true, filename: 'bundle-stats.html', gzipSize: true }),
  ],
})
