/**
 * Playable/locked derivation (SPEC section 5).
 *
 * The split is computed from the dataset's verification levels, never from a
 * list of crop names, so a crop unlocks when the dataset verifies it.
 */
import { nutrientsPerServing } from './portions.ts';
import { NUTRIENT_IDS } from './types.ts';
import type {
  CropRecord,
  Food,
  LocalisedText,
  LockReason,
  PortionSpec,
} from './types.ts';

/** Levels whose values may be scored. */
export const PLAYABLE_LEVELS: readonly string[] = ['corroborated', 'verified'];
/** Levels shown as locked "coming soon" cards. */
export const LOCKED_LEVELS: readonly string[] = ['unverified'];

export type FoodStatus =
  | { readonly kind: 'playable' }
  | { readonly kind: 'locked'; readonly reason: LockReason };

export class CatalogueError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Game data cannot be built:\n- ${issues.join('\n- ')}`);
    this.name = 'CatalogueError';
    this.issues = issues;
  }
}

function hasAnyValue(crop: Pick<CropRecord, 'per100gRaw'>): boolean {
  return NUTRIENT_IDS.some((id) => crop.per100gRaw[id] !== null);
}

/**
 * Classify one crop.
 *
 * - No scored value at all: locked (`no_values`).
 * - Any value at an `unverified` level: locked (`unverified`). A crop with
 *   mixed levels stays locked until every value is corroborated or verified.
 * - Otherwise playable.
 *
 * Throws on a level this code does not know, and on values that carry no
 * verification level, so neither can unlock a crop silently.
 */
export function classifyCrop(
  crop: Pick<CropRecord, 'id' | 'per100gRaw' | 'verificationLevels'>,
): FoodStatus {
  if (!hasAnyValue(crop)) {
    return { kind: 'locked', reason: 'no_values' };
  }
  if (crop.verificationLevels.length === 0) {
    throw new CatalogueError([
      `crop "${crop.id}" has nutrient values but no verification level`,
    ]);
  }
  const unknown = crop.verificationLevels.filter(
    (level) => !PLAYABLE_LEVELS.includes(level) && !LOCKED_LEVELS.includes(level),
  );
  if (unknown.length > 0) {
    throw new CatalogueError([
      `crop "${crop.id}" has unknown verification level(s): ${unknown.join(', ')}`,
    ]);
  }
  if (crop.verificationLevels.some((level) => LOCKED_LEVELS.includes(level))) {
    return { kind: 'locked', reason: 'unverified' };
  }
  return { kind: 'playable' };
}

/**
 * Build the food catalogue from normalised crops plus the game-side layers.
 *
 * Fails when a crop has no Spanish name, when a playable crop has no sourced
 * portion (SPEC section 6: unsourced factors are not allowed), when a crop
 * flagged as not eaten raw is given an uncooked portion, or when a portion or
 * name refers to a crop that is not in the dataset.
 */
export function buildCatalogue(
  crops: readonly CropRecord[],
  portions: Readonly<Record<string, PortionSpec>>,
  spanishNames: Readonly<Record<string, string>>,
): Food[] {
  const issues: string[] = [];
  const foods: Food[] = [];
  const cropIds = new Set(crops.map((crop) => crop.id));

  for (const id of Object.keys(portions)) {
    if (!cropIds.has(id)) issues.push(`portion defined for unknown crop "${id}"`);
  }
  for (const id of Object.keys(spanishNames)) {
    if (!cropIds.has(id)) issues.push(`Spanish name defined for unknown crop "${id}"`);
  }

  for (const crop of crops) {
    const spanishName = spanishNames[crop.id];
    if (spanishName === undefined) {
      issues.push(`crop "${crop.id}" has no Spanish name in the local-names file`);
      continue;
    }
    const names: LocalisedText = { en: crop.nameEn, es: spanishName };
    let status: FoodStatus;
    try {
      status = classifyCrop(crop);
    } catch (error) {
      if (error instanceof CatalogueError) {
        issues.push(...error.issues);
        continue;
      }
      throw error;
    }
    if (status.kind === 'locked') {
      foods.push({ id: crop.id, status: 'locked', names, lockReason: status.reason });
      continue;
    }
    const portion = portions[crop.id];
    if (portion === undefined) {
      issues.push(
        `playable crop "${crop.id}" has no sourced portion (serving size and cooked-yield factor)`,
      );
      continue;
    }
    if (crop.notEatenRaw && portion.state === 'uncooked') {
      issues.push(`crop "${crop.id}" is flagged as not eaten raw but its portion is uncooked`);
      continue;
    }
    foods.push({
      id: crop.id,
      status: 'playable',
      names,
      isProxy: crop.isProxy,
      portion,
      perServing: nutrientsPerServing(crop.per100gRaw, portion),
    });
  }

  if (issues.length > 0) throw new CatalogueError(issues);
  return foods;
}
