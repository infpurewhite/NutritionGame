/**
 * The real build inputs: the pinned dataset snapshot (v0.6.0) plus the
 * reference intakes, portions and scenario copied from version A
 * (NutritionGame f847454).
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
  it('loads 35 crops: 18 with sourced portions are playable, 17 wait for one', () => {
    expect(data.foods).toHaveLength(35);
    expect(playable).toHaveLength(18);
    const locked = data.foods.filter((food) => food.status === 'locked');
    expect(locked).toHaveLength(17);
    expect(new Set(locked.map((food) => food.lockReason))).toEqual(new Set(['no_portion']));
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

  it('converts an INS household measure to the as-eaten serving: 1 medium mashua, boiled', () => {
    const mashua = byId['mashua']!;
    // INS Table I: 62.4 g raw edible; Table II: raw = cooked x 1.11.
    expect(mashua.portion.servingGramsAsEaten / mashua.portion.cookedYieldFactor).toBeCloseTo(62.4, 1);
    expect(mashua.perServing.energy).toBeCloseTo((32 * 62.4) / 100, 1);
    // Mashua has no calcium value in the dataset: still "no data" per serving.
    expect(mashua.perServing.calcium).toBeNull();
    expect(mashua.portion.servingSource.url).toBe('https://hdl.handle.net/20.500.14196/989');
  });

  it('keeps the dataset gaps as "no data" on a real plate', () => {
    const plate = ['quinoa', 'cape-gooseberry', 'potato'].map((id) => ({
      foodId: id,
      servings: 1,
      perServing: byId[id]!.perServing,
    }));
    const score = scorePlate(plate, targets);
    expect(score.nutrients.fibre.missingFoodIds).toEqual(['cape-gooseberry']);
    expect(score.nutrients.fibre.isPartial).toBe(true);
    expect(score.nutrients.iron.missingFoodIds).toEqual([]);
    expect(score.nutrients.calcium.missingFoodIds).toEqual([]);
    expect(score.overall).not.toBeNull();
  });
});
