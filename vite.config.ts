import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const isPages = process.env.DEPLOY_TARGET === 'pages'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192x192.png', 'icon-512x512.png', 'icon-180x180.png'],
      manifest: {
        name: 'Cashlog',
        short_name: 'Cashlog',
        description: '最棒的本地端免费开源记账软件',
        theme_color: '#22c55e',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: isPages ? '/Cashlog/' : '/',
        start_url: isPages ? '/Cashlog/' : '/',
        icons: [
          { src: 'icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/tesseract\.projectnaptha\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'tesseract-lang', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*tesseract.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'tesseract-lang', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  base: isPages ? '/Cashlog/' : './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
