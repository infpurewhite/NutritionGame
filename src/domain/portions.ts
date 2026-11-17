/**
 * Portion layer (SPEC section 6): converts raw per-100 g values to an
 * as-eaten serving.
 *
 * Assumption: nutrients are fully retained on cooking. Only the weight change
 * is modelled, so water-soluble losses are not reflected.
 */
import { NUTRIENT_IDS } from './types.ts';
import type { NutrientId, NutrientValues, PortionSpec } from './types.ts';

/** Raw weight, in grams, that yields one as-eaten serving. */
export function rawEquivalentGrams(
  portion: Pick<PortionSpec, 'servingGramsAsEaten' | 'cookedYieldFactor'>,
): number {
  if (!(portion.servingGramsAsEaten > 0) || !(portion.cookedYieldFactor > 0)) {
    throw new RangeError('serving size and cooked-yield factor must be positive');
  }
  return portion.servingGramsAsEaten / portion.cookedYieldFactor;
}

/** Nutrients in one as-eaten serving. A "no data" value stays "no data". */
export function nutrientsPerServing(
  per100gRaw: NutrientValues,
  portion: Pick<PortionSpec, 'servingGramsAsEaten' | 'cookedYieldFactor'>,
): NutrientValues {
  const factor = rawEquivalentGrams(portion) / 100;
  const out = {} as Record<NutrientId, number | null>;
  for (const id of NUTRIENT_IDS) {
    const value = per100gRaw[id];
    out[id] = value === null ? null : value * factor;
  }
  return out;
}
