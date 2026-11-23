import {
  SCORED_NUTRIENTS,
  type DerivedCrop,
  type NutrientEvaluation,
  type NutrientStatus,
  type PlateEvaluation,
  type PlateItem,
  type PortionRule,
  type ReferenceIntakesFile,
  type Scenario,
  type ScoredNutrient,
  type VerifiedNutrientMap,
} from './types';

/**
 * Target adequacy band boundaries (ratio = actual / mealTarget).
 * Below 0.80 is "short".
 * Energy: 0.80–1.20 is balanced; above 1.20 is "over".
 * Fibre: WHO/FAO TRS 916 specifies >25 g/day as a minimum goal (no upper penalty).
 * Protein, iron, calcium: 0.80–2.00 is balanced for a single meal; above 2.00 is "over".
 */
const LOWER_BALANCED_RATIO = 0.8;
const UPPER_BALANCED_RATIO: Record<ScoredNutrient, number | null> = {
  energy: 1.2,
  protein: 2.0,
  fibre: null,
  iron: 2.0,
  calcium: 2.0,
};

/**
 * Converts an as-eaten cooked/prepared serving count into raw equivalent grams
 * using the food's cooked-yield factor (cookedWeight / rawWeight).
 */
export function getRawEquivalentGrams(portion: PortionRule, servings: number): number {
  if (servings <= 0) return 0;
  return (portion.servingGrams * servings) / portion.cookedYieldFactor;
}

/**
 * Calculates the nutrient contribution of a single plate item (as-eaten portion).
 * Missing (null) nutrient values stay null and are never coerced to zero.
 */
export function calculatePortionNutrients(
  crop: DerivedCrop,
  portion: PortionRule,
  servings: number
): VerifiedNutrientMap {
  const rawGrams = getRawEquivalentGrams(portion, servings);
  const factor = rawGrams / 100;

  const result: VerifiedNutrientMap = {
    energy: null,
    protein: null,
    fibre: null,
    iron: null,
    calcium: null,
  };

  for (const nutrient of SCORED_NUTRIENTS) {
    const rawValue = crop.rawValuesPer100g[nutrient];
    result[nutrient] = rawValue === null ? null : rawValue * factor;
  }

  return result;
}

/**
 * Scores a single nutrient ratio against its target band (0–100).
 */
export function scoreNutrientRatio(
  nutrient: ScoredNutrient,
  ratio: number
): { score: number; status: Exclude<NutrientStatus, 'empty' | 'no_data'> } {
  const upper = UPPER_BALANCED_RATIO[nutrient];

  if (ratio < LOWER_BALANCED_RATIO) {
    const score = Math.max(0, Math.round((ratio / LOWER_BALANCED_RATIO) * 100));
    return { score, status: 'short' };
  }

  if (upper === null || ratio <= upper) {
    return { score: 100, status: 'balanced' };
  }

  // Gentle linear penalty above the upper comfort band, flooring at 0
  const excessSpan = nutrient === 'energy' ? 0.8 : 2.0;
  const penalty = ((ratio - upper) / excessSpan) * 100;
  const score = Math.max(0, Math.round(100 - penalty));
  return { score, status: 'over' };
}

/**
 * Evaluates a complete plate against the scenario's FAO/WHO meal targets.
 *
 * Key invariant (SPEC.md §4):
 * - A missing nutrient value is shown as "no data" and excluded from that nutrient's score.
 * - It is never treated as zero.
 */
export function evaluatePlate(
  items: readonly PlateItem[],
  cropsById: Record<string, DerivedCrop>,
  portionsById: Record<string, PortionRule>,
  scenario: Scenario,
  referenceIntakes: ReferenceIntakesFile
): PlateEvaluation {
  const activeItems = items.filter((item) => {
    const crop = cropsById[item.cropId];
    const portion = portionsById[item.cropId];
    return item.servings > 0 && crop?.playable && Boolean(portion);
  });

  const isEmpty = activeItems.length === 0;
  let totalCookedGrams = 0;

  const sums: Record<ScoredNutrient, number> = {
    energy: 0,
    protein: 0,
    fibre: 0,
    iron: 0,
    calcium: 0,
  };
  const itemsWithDataCount: Record<ScoredNutrient, number> = {
    energy: 0,
    protein: 0,
    fibre: 0,
    iron: 0,
    calcium: 0,
  };
  const missingDataCropIds: Record<ScoredNutrient, string[]> = {
    energy: [],
    protein: [],
    fibre: [],
    iron: [],
    calcium: [],
  };

  for (const item of activeItems) {
    const crop = cropsById[item.cropId];
    const portion = portionsById[item.cropId];
    totalCookedGrams += portion.servingGrams * item.servings;

    const contrib = calculatePortionNutrients(crop, portion, item.servings);
    for (const nutrient of SCORED_NUTRIENTS) {
      const value = contrib[nutrient];
      if (value === null) {
        missingDataCropIds[nutrient].push(crop.id);
      } else {
        sums[nutrient] += value;
        itemsWithDataCount[nutrient] += 1;
      }
    }
  }

  const nutrients = {} as Record<ScoredNutrient, NutrientEvaluation>;
  let scoreSum = 0;
  let scoredNutrientCount = 0;
  let excludedNutrientCount = 0;

  for (const nutrient of SCORED_NUTRIENTS) {
    const ref = referenceIntakes.nutrients[nutrient];
    const mealTarget = ref.dailyTarget * scenario.mealFraction;

    if (isEmpty) {
      nutrients[nutrient] = {
        nutrient,
        unit: ref.unit,
        target: mealTarget,
        dailyTarget: ref.dailyTarget,
        total: 0,
        percentOfTarget: 0,
        score: 0,
        status: 'empty',
        missingDataCropIds: [],
        hasPartialData: false,
      };
      continue;
    }

    if (itemsWithDataCount[nutrient] === 0) {
      // Every food on the plate lacks verified data for this nutrient:
      // show as "no data" and exclude from the overall score (never treat as 0).
      excludedNutrientCount += 1;
      nutrients[nutrient] = {
        nutrient,
        unit: ref.unit,
        target: mealTarget,
        dailyTarget: ref.dailyTarget,
        total: null,
        percentOfTarget: null,
        score: null,
        status: 'no_data',
        missingDataCropIds: missingDataCropIds[nutrient],
        hasPartialData: false,
      };
      continue;
    }

    const total = sums[nutrient];
    const ratio = mealTarget > 0 ? total / mealTarget : 0;
    const { score, status } = scoreNutrientRatio(nutrient, ratio);
    scoreSum += score;
    scoredNutrientCount += 1;

    nutrients[nutrient] = {
      nutrient,
      unit: ref.unit,
      target: mealTarget,
      dailyTarget: ref.dailyTarget,
      total,
      percentOfTarget: Math.round(ratio * 100),
      score,
      status,
      missingDataCropIds: missingDataCropIds[nutrient],
      hasPartialData: missingDataCropIds[nutrient].length > 0,
    };
  }

  const overallScore =
    isEmpty || scoredNutrientCount === 0 ? null : Math.round(scoreSum / scoredNutrientCount);

  return {
    isEmpty,
    totalCookedGrams: Math.round(totalCookedGrams),
    overallScore,
    scoredNutrientCount,
    excludedNutrientCount,
    nutrients,
  };
}
