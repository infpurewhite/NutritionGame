import { fileURLToPath } from 'node:url';

import preact from '@preact/preset-vite';
import { defineConfig } from 'vitest/config';

import { gameDataPlugin } from './build/vite-plugin-game-data.ts';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => ({
  // Relative base: the same build works under any GitHub Pages path.
  base: './',
  plugins: [preact(), gameDataPlugin({ root, fixture: mode === 'fixture' })],
  test: {
    include: ['tests/**/*.test.ts'],
  },
}));
