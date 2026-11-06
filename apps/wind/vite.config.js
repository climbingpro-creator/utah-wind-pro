import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function udotRoadsDev() {
  return {
    name: 'udot-roads-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        if (url.startsWith('/api/terrain')) {
          try {
            const query = new URL(url, 'http://127.0.0.1').searchParams
            const z = Number(query.get('z'))
            const x = Number(query.get('x'))
            const y = Number(query.get('y'))
            const scale = 2 ** (z - 8)
            const utahZ = z === 8 || z === 10 || z === 11 || z === 12
            const inUtah = utahZ
              && x >= Math.floor(45 * scale) && x <= Math.ceil(53 * scale) - 1
              && y >= Math.floor(93 * scale) && y <= Math.ceil(102 * scale) - 1
            if (!inUtah) {
              res.statusCode = 400
              res.end('Tile is outside the Utah terrain set')
              return
            }
            const tile = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`)
            if (!tile.ok) {
              res.statusCode = 502
              res.end()
              return
            }
            const buf = Buffer.from(await tile.arrayBuffer())
            res.statusCode = 200
            res.setHeader('Content-Type', 'image/png')
            res.setHeader('Cache-Control', 'public, max-age=86400')
            res.end(buf)
          } catch {
            res.statusCode = 502
            res.end()
          }
          return
        }
        if (!url.includes('source=udot-roads')) return next()
        try {
          const env = loadEnv(server.config.mode, path.resolve(__dirname, '../..'), '')
          const { fetchUdotRoadStations } = await import('../../api/lib/udotRoadsFeed.js')
          const stations = await fetchUdotRoadStations(env.UDOT_API_KEY)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ stationCount: stations.length, stations }))
        } catch (err) {
          res.statusCode = err.code === 'NO_KEY' ? 500 : 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            error: err.code === 'NO_KEY' ? 'UDOT_API_KEY not configured' : 'UDOT feed failed',
          }))
        }
      })
    },
  }
}

export default defineConfig({
  root: __dirname,
  envDir: path.resolve(__dirname, '../..'),
  plugins: [
    udotRoadsDev(),
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'prompt',
      injectRegister: false,
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
    visualizer({ open: true, filename: 'bundle-stats.html', gzipSize: true }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://liftforecast.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/') ||
            id.includes('node_modules/zustand/')
          ) {
            return 'vendor';
          }
          if (
            id.includes('node_modules/maplibre-gl/') ||
            id.includes('node_modules/react-map-gl/')
          ) {
            return 'vendor-map';
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
})
