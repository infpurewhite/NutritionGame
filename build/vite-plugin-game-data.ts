/**
 * Vite plugin exposing the validated game data as `virtual:game-data`.
 *
 * In `fixture` mode the module resolves to a synthetic fixture so the UI can
 * be exercised without the real data. Production builds never use it.
 */
import { join } from 'node:path';

import type { Plugin } from 'vite';

import { DATA_PATHS, loadGameData } from './game-data.ts';

const VIRTUAL_ID = 'virtual:game-data';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const FIXTURE_PATH = 'tests/fixtures/game-data.fixture.ts';

export function gameDataPlugin(options: { root: string; fixture: boolean }): Plugin {
  return {
    name: 'nutrition-game-data',
    resolveId(id) {
      if (id !== VIRTUAL_ID) return null;
      return options.fixture ? join(options.root, FIXTURE_PATH) : RESOLVED_ID;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      for (const path of Object.values(DATA_PATHS)) {
        this.addWatchFile(join(options.root, path));
      }
      return `export default ${JSON.stringify(loadGameData(options.root))};`;
    },
  };
}
