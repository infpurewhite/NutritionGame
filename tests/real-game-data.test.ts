/**
 * The real build inputs: the pinned dataset snapshot plus the reference
 * intakes, portions and scenario copied from version A (NutritionGame f847454).
 */
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadGameData } from '../build/game-data.ts';
import { mealTargets, scorePlate } from '../src/domain/scoring.ts';
import type { PlayableFood } from '../src/domain/types.ts';

const VERSION_A_COMMIT = 'f847454af1c98ec31bb151622907510254bab7fe';

const data = loadGameData(join(import.meta.dirname, '..'));
const playable = data.foods.filter((food): food is PlayableFood => food.status === 'playable');
const byId = Object.fromEntries(playable.map((food) => [food.id, food]));

const scenario = data.scenarios[0]!;
const profile = data.referenceProfiles.find((p) => p.id === scenario.referenceProfileId)!;
const targets = mealTargets(profile, scenario, data.scoring);

describe('real game data', () => {
  it('loads all 30 crops with a sourced portion for each of the 9 playable ones', () => {
    expect(data.foods).toHaveLength(30);
    expect(playable).toHaveLength(9);
    for (const food of playable) {
      expect(food.portion.servingSource.citation.length, food.id).toBeGreaterThan(10);
      expect(food.portion.yieldSource.citation.length, food.id).toBeGreaterThan(10);
      expect(food.portion.preparedState, food.id).toBeDefined();
    }
  });

  it('records that the intakes, portions and scenario were copied from version A', () => {
    expect(data.provenance).toHaveLength(3);
    for (const ref of data.provenance) {
      expect(ref.url).toContain(VERSION_A_COMMIT);
    }
  });

  it('targets one third of the daily reference intakes at lunch', () => {
    expect(targets.energy.target).toBeCloseTo(2333 / 3);
    expect(targets.protein.target).toBeCloseTo(49.8 / 3);
    expect(targets.iron.target).toBeCloseTo(9.8);
    expect(targets.calcium.target).toBeCloseTo(1000 / 3);
  });

  it('scores the as-eaten serving: 140 g boiled quinoa is 140 / 3.06 g raw', () => {
    expect(byId['quinoa']?.perServing.energy).toBeCloseTo((368 * 140) / 3.06 / 100);
    expect(byId['quinoa']?.perServing.iron).toBeCloseTo((4.57 * 140) / 3.06 / 100);
  });

  it('keeps the dataset gaps as "no data" on a real plate', () => {
    const plate = ['quinoa', 'lima-bean', 'potato'].map((id) => ({
      foodId: id,
      servings: 1,
      perServing: byId[id]!.perServing,
    }));
    const score = scorePlate(plate, targets);
    expect(score.nutrients.iron.missingFoodIds).toEqual(['lima-bean']);
    expect(score.nutrients.calcium.missingFoodIds).toEqual(['potato']);
    expect(score.nutrients.iron.isPartial).toBe(true);
    expect(score.overall).not.toBeNull();
  });
});
