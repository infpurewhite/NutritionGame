import { describe, expect, it } from 'vitest';
import datasetJson from '../src/data/andean-crops.json';
import localNamesJson from '../src/data/local-names.json';
import portionsJson from '../src/data/portions.json';
import referenceIntakesJson from '../src/data/reference-intakes.json';
import scenariosJson from '../src/data/scenarios.json';
import { deriveCropAvailability } from '../src/domain/crops';
import {
  calculatePortionNutrients,
  evaluatePlate,
  getRawEquivalentGrams,
} from '../src/domain/scoring';
import type {
  AndeanCropsDataset,
  LocalNamesFile,
  PortionsFile,
  ReferenceIntakesFile,
  Scenario,
} from '../src/domain/types';

const dataset = datasetJson as unknown as AndeanCropsDataset;
const localNames = localNamesJson as unknown as LocalNamesFile;
const portions = portionsJson as unknown as PortionsFile;
const referenceIntakes = referenceIntakesJson as unknown as ReferenceIntakesFile;
const lunchScenario = (scenariosJson as unknown as Scenario[])[0];

describe('deriveCropAvailability (playable/locked derivation)', () => {
  it('derives the exact 9 playable crops and 21 locked crops from v0.3.0 verification fields', () => {
    const catalog = deriveCropAvailability(dataset, localNames);

    const playableIds = catalog.playable.map((c) => c.id).sort();
    expect(playableIds).toEqual([
      'cape-gooseberry',
      'cherimoya',
      'common-bean',
      'kiwicha',
      'lima-bean',
      'naranjilla',
      'peanut',
      'potato',
      'quinoa',
    ]);
    expect(catalog.locked).toHaveLength(21);
  });

  it('automatically unlocks a crop when a nutrient is upgraded to verified/corroborated', () => {
    const cloned: AndeanCropsDataset = structuredClone(dataset);
    const canihua = cloned.crops.find((c) => c.id === 'canihua');
    expect(canihua).toBeDefined();
    if (canihua?.composition?.values?.protein) {
      canihua.composition.values.protein.verification = 'verified';
    }

    const catalog = deriveCropAvailability(cloned, localNames);
    expect(catalog.byId['canihua'].playable).toBe(true);
    expect(catalog.byId['canihua'].rawValuesPer100g.protein).toBe(15.7);
    // Unverified nutrients on that same crop remain null ("no data")
    expect(catalog.byId['canihua'].rawValuesPer100g.energy).toBeNull();
    expect(catalog.playable).toHaveLength(10);
  });

  it('flags proxy matches (kiwicha and cape-gooseberry) from composition.match', () => {
    const catalog = deriveCropAvailability(dataset, localNames);
    const proxyIds = catalog.playable
      .filter((c) => c.isProxy)
      .map((c) => c.id)
      .sort();
    expect(proxyIds).toEqual(['cape-gooseberry', 'kiwicha']);
  });

  it('distinguishes unverified vs no_data lock reasons and flags tarwi toxic raw warning', () => {
    const catalog = deriveCropAvailability(dataset, localNames);
    expect(catalog.byId['tarwi'].playable).toBe(false);
    expect(catalog.byId['tarwi'].lockReason).toBe('unverified');
    expect(catalog.byId['tarwi'].toxicRawWarning).toBe(true);

    expect(catalog.byId['ulluco'].playable).toBe(false);
    expect(catalog.byId['ulluco'].lockReason).toBe('no_data');
    expect(catalog.byId['ulluco'].names.es).toBe('Olluco');
    expect(catalog.byId['cape-gooseberry'].names.es).toBe('Aguaymanto');
    expect(catalog.byId['purple-corn'].names.es).toBe('Maíz morado');
  });
});

describe('portion conversion and as-eaten nutrient calculations', () => {
  const catalog = deriveCropAvailability(dataset, localNames);

  it('converts cooked quinoa serving (140 g) to dry raw equivalent via yield factor 3.06', () => {
    const quinoa = catalog.byId['quinoa'];
    const rule = portions.portions['quinoa'];

    const rawGrams = getRawEquivalentGrams(rule, 1);
    expect(rawGrams).toBeCloseTo(140 / 3.06, 4);

    const nutrients = calculatePortionNutrients(quinoa, rule, 1);
    // 368 kcal / 100 g raw * (140 / 3.06 g) ≈ 168.37 kcal (NOT 368 * 1.4 = 515.2 kcal!)
    expect(nutrients.energy).toBeCloseTo((368 * (140 / 3.06)) / 100, 2);
    expect(nutrients.energy!).toBeLessThan(200);
    expect(nutrients.protein).toBeCloseTo((14.12 * (140 / 3.06)) / 100, 2);
  });

  it('preserves null for missing nutrients rather than converting to zero', () => {
    const potato = catalog.byId['potato'];
    const potatoNutrients = calculatePortionNutrients(potato, portions.portions['potato'], 1);
    // Potato in v0.3.0 has no calcium value
    expect(potatoNutrients.calcium).toBeNull();
    expect(potatoNutrients.energy).toBeCloseTo(77 * 1.1, 2);

    const naranjilla = catalog.byId['naranjilla'];
    const naranjillaNutrients = calculatePortionNutrients(
      naranjilla,
      portions.portions['naranjilla'],
      1
    );
    expect(naranjillaNutrients.energy).toBeCloseTo(25 * 1.4, 2);
    expect(naranjillaNutrients.fibre).toBeNull();
    expect(naranjillaNutrients.iron).toBeNull();
    expect(naranjillaNutrients.calcium).toBeNull();
  });
});

describe('evaluatePlate (scoring logic & no-data handling)', () => {
  const catalog = deriveCropAvailability(dataset, localNames);

  it('returns empty state with null overall score when plate has no items', () => {
    const result = evaluatePlate(
      [],
      catalog.byId,
      portions.portions,
      lunchScenario,
      referenceIntakes
    );
    expect(result.isEmpty).toBe(true);
    expect(result.overallScore).toBeNull();
    expect(result.totalCookedGrams).toBe(0);
    expect(result.nutrients.energy.status).toBe('empty');
  });

  it('excludes nutrients with no data across all plate items instead of scoring them as zero', () => {
    // Naranjilla has verified energy & protein, but NO fibre, iron, or calcium
    const result = evaluatePlate(
      [{ cropId: 'naranjilla', servings: 1 }],
      catalog.byId,
      portions.portions,
      lunchScenario,
      referenceIntakes
    );

    expect(result.isEmpty).toBe(false);
    expect(result.scoredNutrientCount).toBe(2);
    expect(result.excludedNutrientCount).toBe(3);

    for (const missing of ['fibre', 'iron', 'calcium'] as const) {
      expect(result.nutrients[missing].status).toBe('no_data');
      expect(result.nutrients[missing].total).toBeNull();
      expect(result.nutrients[missing].score).toBeNull();
      expect(result.nutrients[missing].missingDataCropIds).toEqual(['naranjilla']);
    }

    // Overall score must average ONLY the 2 nutrients with data, not divide by 5
    const expectedAvg = Math.round(
      ((result.nutrients.energy.score ?? 0) + (result.nutrients.protein.score ?? 0)) / 2
    );
    expect(result.overallScore).toBe(expectedAvg);
  });

  it('flags partial data when some plate items have data and others lack data for a nutrient', () => {
    // Quinoa has calcium (47 mg/100 g raw); potato lacks calcium
    const result = evaluatePlate(
      [
        { cropId: 'quinoa', servings: 1 },
        { cropId: 'potato', servings: 1 },
      ],
      catalog.byId,
      portions.portions,
      lunchScenario,
      referenceIntakes
    );

    expect(result.nutrients.calcium.status).not.toBe('no_data');
    expect(result.nutrients.calcium.hasPartialData).toBe(true);
    expect(result.nutrients.calcium.missingDataCropIds).toEqual(['potato']);
    // Energy is present on both, so no partial data
    expect(result.nutrients.energy.hasPartialData).toBe(false);
    expect(result.nutrients.energy.missingDataCropIds).toEqual([]);
  });

  it('scores a balanced Andean lunch plate high and detects over-target energy', () => {
    // Balanced lunch: quinoa + common bean + kiwicha + peanut + cherimoya
    const balanced = evaluatePlate(
      [
        { cropId: 'quinoa', servings: 1 },
        { cropId: 'common-bean', servings: 1 },
        { cropId: 'kiwicha', servings: 1 },
        { cropId: 'peanut', servings: 1 },
        { cropId: 'cherimoya', servings: 1 },
      ],
      catalog.byId,
      portions.portions,
      lunchScenario,
      referenceIntakes
    );

    expect(balanced.scoredNutrientCount).toBe(5);
    expect(balanced.excludedNutrientCount).toBe(0);
    expect(balanced.nutrients.energy.status).toBe('balanced');
    expect(balanced.overallScore!).toBeGreaterThanOrEqual(75);

    // Excessive peanuts pushes energy clearly into "over"
    const overEnergy = evaluatePlate(
      [{ cropId: 'peanut', servings: 8 }],
      catalog.byId,
      portions.portions,
      lunchScenario,
      referenceIntakes
    );
    expect(overEnergy.nutrients.energy.status).toBe('over');
    expect(overEnergy.nutrients.energy.score!).toBeLessThan(100);
  });

  it('ignores locked crops even if passed in plate items', () => {
    const result = evaluatePlate(
      [{ cropId: 'tarwi', servings: 2 }],
      catalog.byId,
      portions.portions,
      lunchScenario,
      referenceIntakes
    );
    expect(result.isEmpty).toBe(true);
    expect(result.overallScore).toBeNull();
  });
});
