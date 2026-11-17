/**
 * Adapter from the andean-crops dataset JSON to the game's normalised crop
 * records. This is the only module that knows the dataset's field names.
 *
 * NOT IMPLEMENTED. The dataset snapshot could not be read when the first
 * milestone was started, so no field name here would be more than a guess.
 * Write this against the real v0.3.0 file and its schema once the snapshot is
 * in `data/andean-crops/`. It must:
 *
 * - return the dataset's own version string;
 * - convert each scored nutrient to game units (kcal, g, g, mg, mg), keeping a
 *   missing value as `null`, never 0;
 * - copy the verification level(s) of the scored values verbatim;
 * - set `isProxy` from the dataset's proxy-match field.
 */
import type { CropRecord } from '../src/domain/types.ts';

export interface AdaptedDataset {
  readonly version: string;
  readonly crops: readonly CropRecord[];
}

export function adaptDataset(_raw: unknown): AdaptedDataset {
  throw new Error(
    'adaptDataset is not implemented: it has to be written against the real dataset snapshot ' +
      '(see the comment at the top of build/adapt-dataset.ts).',
  );
}
