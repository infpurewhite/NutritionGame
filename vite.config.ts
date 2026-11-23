import { defineConfig, loadEnv } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const base = env.BASE_PATH || './';

  return {
    base,
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg', 'assets/img/crops/*.webp'],
      manifest: {
        name: 'Plato Andino — Andean Nutrition Game',
        short_name: 'Plato Andino',
        description:
          'Build a balanced plate from Andean ingredients using verified food composition data and FAO/WHO reference intakes.',
        theme_color: '#8c3b2b',
        background_color: '#faf6ef',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,webp,json,woff2}'],
      },
    }),
  ],
  };
});
