import { describe, expect, it } from 'vitest';

import { nutrientsPerServing } from '../src/domain/portions.ts';
import { mealTargets, scorePlate, scoreTotal } from '../src/domain/scoring.ts';
import type { MealTargets, PlateItem } from '../src/domain/scoring.ts';
import type { NutrientValues } from '../src/domain/types.ts';
import { FIXTURE_PROFILE, FIXTURE_SCENARIO, FIXTURE_SCORING } from './fixtures/game-data.fixture.ts';

/** Fixture meal targets: 1000 kcal (900 to 1100), 25 g, 10 g, 10 mg, 500 mg. */
const targets: MealTargets = mealTargets(FIXTURE_PROFILE, FIXTURE_SCENARIO, FIXTURE_SCORING);

function item(foodId: string, perServing: NutrientValues, servings = 1): PlateItem {
  return { foodId, servings, perServing };
}

/** One serving that lands exactly on every fixture target. */
const ON_TARGET: NutrientValues = { energy: 1000, protein: 25, fibre: 10, iron: 10, calcium: 500 };

describe('mealTargets', () => {
  it('scales the daily reference intake by the meal share', () => {
    expect(targets.protein).toEqual({ target: 25, min: 25, max: null });
    expect(targets.calcium.target).toBe(500);
  });

  it('gives a range band a lower and an upper bound', () => {
    expect(targets.energy.target).toBe(1000);
    expect(targets.energy.min).toBeCloseTo(900);
    expect(targets.energy.max).toBeCloseTo(1100);
  });

  it('rejects a meal share outside (0, 1]', () => {
    for (const value of [0, -0.1, 1.5, Number.NaN]) {
      const scenario = { mealShare: { ...FIXTURE_SCENARIO.mealShare, value } };
      expect(() => mealTargets(FIXTURE_PROFILE, scenario, FIXTURE_SCORING)).toThrow(RangeError);
    }
  });
});

describe('scoreTotal', () => {
  const band = { target: 1000, min: 900, max: 1100 };

  it('scores a shortfall as the fraction of the lower bound reached', () => {
    expect(scoreTotal(450, band)).toEqual({ score: 0.5, verdict: 'short' });
    expect(scoreTotal(0, band)).toEqual({ score: 0, verdict: 'short' });
  });

  it('is on target anywhere inside the band, bounds included', () => {
    for (const total of [900, 1000, 1100]) {
      expect(scoreTotal(total, band)).toEqual({ score: 1, verdict: 'on_target' });
    }
  });

  it('penalises an excess linearly, reaching zero at twice the upper bound', () => {
    expect(scoreTotal(1650, band).verdict).toBe('over');
    expect(scoreTotal(1650, band).score).toBeCloseTo(0.5);
    expect(scoreTotal(2200, band).score).toBe(0);
    expect(scoreTotal(5000, band).score).toBe(0);
  });

  it('never marks an at-least nutrient as over', () => {
    expect(scoreTotal(1e6, { target: 25, min: 25, max: null })).toEqual({
      score: 1,
      verdict: 'on_target',
    });
  });
});

describe('scorePlate', () => {
  it('sums servings across foods', () => {
    const half: NutrientValues = { energy: 250, protein: 6.25, fibre: 2.5, iron: 2.5, calcium: 125 };
    const score = scorePlate([item('a', half, 2), item('b', half, 2)], targets);
    expect(score.nutrients.energy.total).toBe(1000);
    expect(score.nutrients.iron.total).toBe(10);
    expect(score.overall).toBe(100);
  });

  it('reports what is short and what is over', () => {
    const plate = [item('a', { energy: 1650, protein: 12.5, fibre: 10, iron: 10, calcium: 500 })];
    const score = scorePlate(plate, targets);
    expect(score.nutrients.energy.verdict).toBe('over');
    expect(score.nutrients.protein.verdict).toBe('short');
    expect(score.nutrients.fibre.verdict).toBe('on_target');
    // (0.5 + 0.5 + 1 + 1 + 1) / 5
    expect(score.overall).toBe(80);
  });

  it('treats an empty plate as a true zero, not as missing data', () => {
    const score = scorePlate([], targets);
    expect(score.nutrients.iron).toMatchObject({
      total: 0,
      verdict: 'short',
      score: 0,
      isPartial: false,
    });
    expect(score.overall).toBe(0);
  });

  it('ignores items with zero servings', () => {
    const noIron = { ...ON_TARGET, iron: null };
    const score = scorePlate([item('a', ON_TARGET), item('b', noIron, 0)], targets);
    expect(score.nutrients.iron.missingFoodIds).toEqual([]);
    expect(score.overall).toBe(100);
  });

  it('rejects negative or non-finite servings', () => {
    expect(() => scorePlate([item('a', ON_TARGET, -1)], targets)).toThrow(RangeError);
    expect(() => scorePlate([item('a', ON_TARGET, Number.NaN)], targets)).toThrow(RangeError);
  });
});

describe('"no data" handling', () => {
  it('leaves a missing value out of the total and names the food', () => {
    const plate = [
      item('with-iron', { ...ON_TARGET, iron: 4 }),
      item('no-iron', { energy: 0, protein: 0, fibre: 0, iron: null, calcium: 0 }),
    ];
    const iron = scorePlate(plate, targets).nutrients.iron;
    expect(iron.total).toBe(4);
    expect(iron.missingFoodIds).toEqual(['no-iron']);
    expect(iron.isPartial).toBe(true);
    expect(iron.score).toBeCloseTo(0.4);
  });

  it('gives no total and no score when no food on the plate has data', () => {
    const iron = scorePlate([item('a', { ...ON_TARGET, iron: null })], targets).nutrients.iron;
    expect(iron.total).toBeNull();
    expect(iron.score).toBeNull();
    expect(iron.verdict).toBe('no_data');
    expect(iron.missingFoodIds).toEqual(['a']);
  });

  it('never treats "no data" as zero in the overall score', () => {
    const missing = scorePlate([item('a', { ...ON_TARGET, iron: null })], targets);
    const zero = scorePlate([item('a', { ...ON_TARGET, iron: 0 })], targets);
    // Missing iron is left out: the mean runs over the four scored nutrients.
    expect(missing.overall).toBe(100);
    // A true zero is scored: (1 + 1 + 1 + 0 + 1) / 5.
    expect(zero.overall).toBe(80);
    expect(zero.nutrients.iron).toMatchObject({ total: 0, score: 0, verdict: 'short' });
  });

  it('returns no overall score when every nutrient lacks data', () => {
    const nothing: NutrientValues = {
      energy: null,
      protein: null,
      fibre: null,
      iron: null,
      calcium: null,
    };
    expect(scorePlate([item('a', nothing)], targets).overall).toBeNull();
  });

  it('keeps "no data" through the portion conversion', () => {
    const perServing = nutrientsPerServing(
      { energy: 400, protein: 10, fibre: 10, iron: null, calcium: 100 },
      { servingGramsAsEaten: 150, cookedYieldFactor: 3 },
    );
    expect(perServing.iron).toBeNull();
    expect(perServing.energy).toBe(200);
  });
});
