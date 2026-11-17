/**
 * `npm run data:validate`: run the build-time data checks on their own.
 * Exits 1 with the list of problems when the game data is not ready.
 */
import process from 'node:process';

import { loadGameData } from './game-data.ts';

try {
  const data = loadGameData(process.cwd());
  const playable = data.foods.filter((food) => food.status === 'playable').length;
  process.stdout.write(
    `Game data OK: ${data.dataset.name} ${data.dataset.version}, ` +
      `${playable} playable and ${data.foods.length - playable} locked foods, ` +
      `${data.scenarios.length} scenario(s).\n`,
  );
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
