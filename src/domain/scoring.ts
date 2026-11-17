/**
 * Plate scoring (SPEC section 4).
 *
 * "No data" rule: a missing nutrient value is left out of that nutrient's
 * total and reported by food id. It is never added as zero. A nutrient for
 * which no food on the plate has data gets no total and no score, and is left
 * out of the overall score.
 */
import { NUTRIENT_IDS } from './types.ts';
import type {
  NutrientId,
  NutrientValues,
  ReferenceProfile,
  Scenario,
  ScoringConfig,
} from './types.ts';

export interface MealTarget {
  /** Daily reference intake multiplied by the scenario's meal share. */
  readonly target: number;
  /** Lowest total that counts as on target. */
  readonly min: number;
  /** Highest total that counts as on target; `null` when there is no upper bound. */
  readonly max: number | null;
}

export type MealTargets = Readonly<Record<NutrientId, MealTarget>>;

export interface PlateItem {
  readonly foodId: string;
  /** Number of servings; fractions allowed. */
  readonly servings: number;
  readonly perServing: NutrientValues;
}

export type Verdict = 'short' | 'on_target' | 'over' | 'no_data';

export interface NutrientResult {
  readonly nutrient: NutrientId;
  readonly target: MealTarget;
  /** Sum over foods that have data; `null` when no food on the plate has data. */
  readonly total: number | null;
  /** Foods on the plate with no data for this nutrient. */
  readonly missingFoodIds: readonly string[];
  /** True when the total leaves out at least one food. */
  readonly isPartial: boolean;
  /** 0 to 1, or `null` when the nutrient is not scored. */
  readonly score: number | null;
  readonly verdict: Verdict;
}

export interface PlateScore {
  readonly nutrients: Readonly<Record<NutrientId, NutrientResult>>;
  /** 0 to 100: unweighted mean of the scored nutrients. `null` when none is scored. */
  readonly overall: number | null;
}

/** Meal targets for a scenario: daily reference intake x meal share, with bands. */
export function mealTargets(
  profile: ReferenceProfile,
  scenario: Pick<Scenario, 'mealShare'>,
  config: ScoringConfig,
): MealTargets {
  const share = scenario.mealShare.value;
  if (!(share > 0 && share <= 1)) {
    throw new RangeError(`meal share must be in (0, 1], got ${share}`);
  }
  const out = {} as Record<NutrientId, MealTarget>;
  for (const id of NUTRIENT_IDS) {
    const target = profile.intakes[id].amountPerDay * share;
    const band = config.bands[id];
    if (band.kind === 'range') {
      if (!(band.tolerance >= 0 && band.tolerance < 1)) {
        throw new RangeError(`tolerance for ${id} must be in [0, 1), got ${band.tolerance}`);
      }
      out[id] = {
        target,
        min: target * (1 - band.tolerance),
        max: target * (1 + band.tolerance),
      };
    } else {
      out[id] = { target, min: target, max: null };
    }
  }
  return out;
}

/**
 * Score one total against its target.
 *
 * - Below `min`: `total / min`, verdict `short`.
 * - Inside the band: 1, verdict `on_target`.
 * - Above `max`: falls linearly from 1 at `max` to 0 at twice `max`, verdict `over`.
 */
export function scoreTotal(
  total: number,
  target: MealTarget,
): { score: number; verdict: Exclude<Verdict, 'no_data'> } {
  if (total < target.min) {
    return { score: target.min > 0 ? total / target.min : 0, verdict: 'short' };
  }
  if (target.max !== null && total > target.max) {
    return { score: Math.max(0, 1 - (total - target.max) / target.max), verdict: 'over' };
  }
  return { score: 1, verdict: 'on_target' };
}

function scoreNutrient(
  nutrient: NutrientId,
  items: readonly PlateItem[],
  target: MealTarget,
): NutrientResult {
  let known = 0;
  let foodsWithData = 0;
  const missingFoodIds: string[] = [];
  for (const item of items) {
    const value = item.perServing[nutrient];
    if (value === null) {
      missingFoodIds.push(item.foodId);
    } else {
      known += value * item.servings;
      foodsWithData += 1;
    }
  }
  // An empty plate is a true zero. A plate whose foods all lack data is not.
  if (items.length > 0 && foodsWithData === 0) {
    return {
      nutrient,
      target,
      total: null,
      missingFoodIds,
      isPartial: true,
      score: null,
      verdict: 'no_data',
    };
  }
  const { score, verdict } = scoreTotal(known, target);
  return {
    nutrient,
    target,
    total: known,
    missingFoodIds,
    isPartial: missingFoodIds.length > 0,
    score,
    verdict,
  };
}

/** Score a plate on the five nutrients. Items with zero servings are ignored. */
export function scorePlate(items: readonly PlateItem[], targets: MealTargets): PlateScore {
  for (const item of items) {
    if (!(item.servings >= 0) || !Number.isFinite(item.servings)) {
      throw new RangeError(`servings for "${item.foodId}" must be a non-negative number`);
    }
  }
  const onPlate = items.filter((item) => item.servings > 0);
  const nutrients = {} as Record<NutrientId, NutrientResult>;
  const scored: number[] = [];
  for (const id of NUTRIENT_IDS) {
    const result = scoreNutrient(id, onPlate, targets[id]);
    nutrients[id] = result;
    if (result.score !== null) scored.push(result.score);
  }
  const overall =
    scored.length === 0
      ? null
      : Math.round((100 * scored.reduce((sum, value) => sum + value, 0)) / scored.length);
  return { nutrients, overall };
}
