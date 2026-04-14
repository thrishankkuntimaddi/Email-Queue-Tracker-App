import { defineConfig } from 'vite'
import react      from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path        from 'path'

export default defineConfig({
  base: '/Email-Queue-Tracker-App/',   // GitHub Pages repo sub-path

  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      // Auto-update the service worker — users always get the latest version
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // Assets to include in the service worker pre-cache
      includeAssets: [
        'email-icon.svg',
        'pwa-192.png',
        'pwa-512.png',
        'apple-touch-icon.png',
      ],

      // Web App Manifest — what Chrome shows in the install prompt
      manifest: {
        name:             'Email Cooldown Dashboard',
        short_name:       'EmailCD',
        description:      'Track email rate limits in real time across all devices',
        theme_color:      '#09090b',
        background_color: '#09090b',
        display:          'standalone',
        orientation:      'portrait-primary',
        // Must match the Vite base path for GitHub Pages
        scope:            '/Email-Queue-Tracker-App/',
        start_url:        '/Email-Queue-Tracker-App/',
        icons: [
          {
            src:     'pwa-192.png',
            sizes:   '192x192',
            type:    'image/png',
            purpose: 'any',
          },
          {
            src:     'pwa-512.png',
            sizes:   '512x512',
            type:    'image/png',
            purpose: 'any',
          },
          {
            // Second entry for same file — declared as maskable
            // Android adaptive icons use a safe-zone inside the maskable icon
            src:     'pwa-512.png',
            sizes:   '512x512',
            type:    'image/png',
            purpose: 'maskable',
          },
        ],
      },

      // Workbox cache strategy
      workbox: {
        // Pre-cache all build artifacts
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],

        // Discard old outdated caches on service worker update
        cleanupOutdatedCaches: true,

        // ⚠️ IMPORTANT: Firebase (Firestore / Auth) must ALWAYS go to the network.
        // Never serve these from the SW cache or you'll get stale auth tokens and
        // outdated Firestore data.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler:    'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/firebase\.googleapis\.com\/.*/i,
            handler:    'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*/i,
            handler:    'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/securetoken\.googleapis\.com\/.*/i,
            handler:    'NetworkOnly',
          },
        ],
      },

      // Development: disable service worker in dev to avoid caching side-effects
      devOptions: {
        enabled: false,
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
