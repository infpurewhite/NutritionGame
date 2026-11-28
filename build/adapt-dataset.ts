/**
 * Adapter from the andean-crops dataset JSON to the game's normalised crop
 * records. This is the only module that knows the dataset's field names.
 *
 * The input must already have passed `consumer-contract.schema.json`, which
 * also fixes the units (kcal, g, g, mg, mg), so no conversion is done here.
 */
import { NUTRIENT_IDS } from '../src/domain/types.ts';
import type { CropRecord, NutrientId } from '../src/domain/types.ts';

/** The subset of the dataset file that the game reads. */
interface DatasetFile {
  readonly metadata: { readonly title: string; readonly version: string };
  readonly crops: readonly {
    readonly id: string;
    readonly names: { readonly common: string; readonly es: string };
    readonly composition: {
      readonly match?: 'direct' | 'proxy' | 'unknown';
      readonly values: Readonly<
        Record<string, { readonly value: number; readonly verification: string } | undefined>
      >;
    };
    readonly flags: readonly { readonly code: string }[];
  }[];
}

export interface AdaptedDataset {
  readonly title: string;
  readonly version: string;
  readonly crops: readonly CropRecord[];
}

/** Dataset flag marking a food whose raw form is not eaten (tarwi). */
const NOT_EATEN_RAW_FLAG = 'not-eaten-raw';

/**
 * Normalise the dataset. A nutrient with no entry stays `null` ("no data").
 * Only the verification levels of the five scored nutrients are collected,
 * because those are the only values the game uses.
 */
export function adaptDataset(raw: unknown): AdaptedDataset {
  const dataset = raw as DatasetFile;
  const crops = dataset.crops.map((crop): CropRecord => {
    const per100gRaw = {} as Record<NutrientId, number | null>;
    const levels = new Set<string>();
    for (const id of NUTRIENT_IDS) {
      const entry = crop.composition.values[id];
      if (entry === undefined) {
        per100gRaw[id] = null;
      } else {
        per100gRaw[id] = entry.value;
        levels.add(entry.verification);
      }
    }
    return {
      id: crop.id,
      nameEn: crop.names.common,
      nameEs: crop.names.es,
      per100gRaw,
      verificationLevels: [...levels].sort(),
      isProxy: crop.composition.match === 'proxy',
      notEatenRaw: crop.flags.some((flag) => flag.code === NOT_EATEN_RAW_FLAG),
    };
  });
  return { title: dataset.metadata.title, version: dataset.metadata.version, crops };
}
