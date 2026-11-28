import { describe, expect, it } from 'vitest';

import { CatalogueError, buildCatalogue, classifyCrop } from '../src/domain/catalogue.ts';
import { nutrientsPerServing, rawEquivalentGrams } from '../src/domain/portions.ts';
import type { CropRecord, NutrientValues } from '../src/domain/types.ts';
import {
  FIXTURE_CROPS,
  FIXTURE_PORTIONS,
} from './fixtures/game-data.fixture.ts';

const VALUES: NutrientValues = { energy: 100, protein: 2, fibre: 2, iron: 1, calcium: 10 };
const NO_VALUES: NutrientValues = {
  energy: null,
  protein: null,
  fibre: null,
  iron: null,
  calcium: null,
};

function crop(verificationLevels: string[], per100gRaw: NutrientValues = VALUES): CropRecord {
  return {
    id: 'x',
    nameEn: 'X',
    nameEs: 'X',
    per100gRaw,
    verificationLevels,
    isProxy: false,
    notEatenRaw: false,
  };
}

describe('classifyCrop', () => {
  it('makes verified and corroborated crops playable', () => {
    expect(classifyCrop(crop(['verified']))).toEqual({ kind: 'playable' });
    expect(classifyCrop(crop(['corroborated']))).toEqual({ kind: 'playable' });
    expect(classifyCrop(crop(['corroborated', 'verified']))).toEqual({ kind: 'playable' });
  });

  it('locks crops with unverified values', () => {
    expect(classifyCrop(crop(['unverified']))).toEqual({ kind: 'locked', reason: 'unverified' });
  });

  it('keeps a crop locked while any value is unverified', () => {
    expect(classifyCrop(crop(['verified', 'unverified']))).toEqual({
      kind: 'locked',
      reason: 'unverified',
    });
  });

  it('locks crops with no values, whatever level is recorded', () => {
    expect(classifyCrop(crop([], NO_VALUES))).toEqual({ kind: 'locked', reason: 'no_values' });
    expect(classifyCrop(crop(['verified'], NO_VALUES))).toEqual({
      kind: 'locked',
      reason: 'no_values',
    });
  });

  it('treats a crop with one value and four gaps as having values', () => {
    expect(classifyCrop(crop(['verified'], { ...NO_VALUES, iron: 1 }))).toEqual({
      kind: 'playable',
    });
  });

  it('refuses an unknown verification level instead of unlocking', () => {
    expect(() => classifyCrop(crop(['peer-reviewed']))).toThrow(CatalogueError);
  });

  it('refuses values that carry no verification level', () => {
    expect(() => classifyCrop(crop([]))).toThrow(CatalogueError);
  });
});

describe('buildCatalogue', () => {
  const foods = buildCatalogue(FIXTURE_CROPS, FIXTURE_PORTIONS);
  const byId = Object.fromEntries(foods.map((food) => [food.id, food]));

  it('derives the playable/locked split from the verification fields', () => {
    expect(foods.filter((food) => food.status === 'playable').map((food) => food.id)).toEqual([
      'fixture-grain',
      'fixture-tuber',
      'fixture-fruit',
    ]);
    expect(byId['fixture-legume']).toMatchObject({ status: 'locked', lockReason: 'unverified' });
    expect(byId['fixture-root']).toMatchObject({ status: 'locked', lockReason: 'no_values' });
  });

  it('unlocks a crop when only its verification level changes', () => {
    const upgraded = FIXTURE_CROPS.map((entry) =>
      entry.id === 'fixture-legume' ? { ...entry, verificationLevels: ['verified'] } : entry,
    );
    const portions = { ...FIXTURE_PORTIONS, 'fixture-legume': FIXTURE_PORTIONS['fixture-grain']! };
    const legume = buildCatalogue(upgraded, portions).find(
      (food) => food.id === 'fixture-legume',
    );
    expect(legume?.status).toBe('playable');
  });

  it('ships no nutrient values for locked foods', () => {
    expect(byId['fixture-legume']).not.toHaveProperty('perServing');
    expect(byId['fixture-legume']).not.toHaveProperty('portion');
  });

  it('carries the proxy flag and both names', () => {
    expect(byId['fixture-fruit']).toMatchObject({ isProxy: true });
    expect(byId['fixture-grain']).toMatchObject({
      isProxy: false,
      names: { en: 'Fixture grain (synthetic)', es: 'Grano de prueba (sintético)' },
    });
  });

  it('scores the as-eaten portion, not raw 100 g', () => {
    // 150 g cooked at yield 3 is 50 g raw: half of the per-100 g values.
    expect(byId['fixture-grain']).toMatchObject({
      perServing: { energy: 200, protein: 5, fibre: 5, iron: 5, calcium: 50 },
    });
  });

  it('locks a crop with playable values until it has a sourced portion', () => {
    const { 'fixture-grain': _removed, ...portions } = FIXTURE_PORTIONS;
    const grain = buildCatalogue(FIXTURE_CROPS, portions).find((food) => food.id === 'fixture-grain');
    expect(grain).toEqual({
      id: 'fixture-grain',
      status: 'locked',
      names: { en: 'Fixture grain (synthetic)', es: 'Grano de prueba (sintético)' },
      lockReason: 'no_portion',
    });
  });

  it('refuses an uncooked portion for tarwi even when the dataset has no "not eaten raw" flag', () => {
    const tarwi = { ...crop(['verified']), id: 'tarwi' };
    const uncooked = { ...FIXTURE_PORTIONS['fixture-fruit']!, state: 'uncooked' as const };
    expect(() => buildCatalogue([tarwi], { tarwi: uncooked })).toThrow(/"tarwi" must not be eaten raw/);
    const cooked = { ...FIXTURE_PORTIONS['fixture-grain']!, state: 'cooked' as const };
    expect(buildCatalogue([tarwi], { tarwi: cooked })[0]?.status).toBe('playable');
  });

  it('does not require a portion for a locked crop', () => {
    expect(FIXTURE_PORTIONS).not.toHaveProperty('fixture-legume');
    expect(byId['fixture-legume']?.status).toBe('locked');
  });

  it('fails on a portion for a crop that is not in the dataset', () => {
    const portions = { ...FIXTURE_PORTIONS, ghost: FIXTURE_PORTIONS['fixture-grain']! };
    expect(() => buildCatalogue(FIXTURE_CROPS, portions)).toThrow(/unknown crop "ghost"/);
  });
});

describe('portions', () => {
  it('converts an as-eaten serving to its raw weight', () => {
    expect(rawEquivalentGrams({ servingGramsAsEaten: 150, cookedYieldFactor: 3 })).toBe(50);
    expect(rawEquivalentGrams({ servingGramsAsEaten: 100, cookedYieldFactor: 1 })).toBe(100);
  });

  it('rejects non-positive serving sizes and yield factors', () => {
    expect(() => rawEquivalentGrams({ servingGramsAsEaten: 0, cookedYieldFactor: 1 })).toThrow(
      RangeError,
    );
    expect(() => nutrientsPerServing(VALUES, { servingGramsAsEaten: 100, cookedYieldFactor: 0 })).toThrow(
      RangeError,
    );
  });
});
