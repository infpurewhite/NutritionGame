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
  it('derives 18 playable and 17 locked crops from v0.6.0 verification fields and sourced portions', () => {
    const catalog = deriveCropAvailability(dataset, localNames, portions.portions);

    const playableIds = catalog.playable.map((c) => c.id).sort();
    expect(playableIds).toEqual([
      'aji-amarillo',
      'cape-gooseberry',
      'cherimoya',
      'common-bean',
      'granadilla',
      'kiwicha',
      'lima-bean',
      'lucuma',
      'mashua',
      'naranjilla',
      'oca',
      'pacay',
      'peanut',
      'potato',
      'quinoa',
      'tuna',
      'ulluco',
      'yacon',
    ]);
    expect(catalog.locked).toHaveLength(17);
    // Every v0.6.0 value is verified, so each locked crop is waiting only for a sourced portion
    expect(new Set(catalog.locked.map((c) => c.lockReason))).toEqual(new Set(['no_portion']));
  });

  it('automatically unlocks a crop once a nutrient is verified and it has a sourced portion', () => {
    const cloned: AndeanCropsDataset = structuredClone(dataset);
    const canihua = cloned.crops.find((c) => c.id === 'canihua');
    expect(canihua).toBeDefined();
    for (const entry of Object.values(canihua?.composition?.values ?? {})) {
      entry.verification = 'unverified';
    }
    expect(deriveCropAvailability(cloned, localNames, portions.portions).byId['canihua'].lockReason).toBe(
      'unverified'
    );

    if (canihua?.composition?.values?.protein) {
      canihua.composition.values.protein.verification = 'verified';
    }
    const withCanihuaPortion = { ...portions.portions, canihua: portions.portions['quinoa'] };
    const catalog = deriveCropAvailability(cloned, localNames, withCanihuaPortion);
    expect(catalog.byId['canihua'].playable).toBe(true);
    expect(catalog.byId['canihua'].rawValuesPer100g.protein).toBe(15.7);
    // Unverified nutrients on that same crop remain null ("no data")
    expect(catalog.byId['canihua'].rawValuesPer100g.energy).toBeNull();
    expect(catalog.playable).toHaveLength(19);
  });

  it('flags proxy matches (kiwicha and cape-gooseberry) from composition.match', () => {
    const catalog = deriveCropAvailability(dataset, localNames, portions.portions);
    const proxyIds = catalog.playable
      .filter((c) => c.isProxy)
      .map((c) => c.id)
      .sort();
    expect(proxyIds).toEqual(['cape-gooseberry', 'kiwicha']);
  });

  it('distinguishes no_portion, unverified and no_data lock reasons and flags tarwi toxic raw warning', () => {
    const catalog = deriveCropAvailability(dataset, localNames, portions.portions);
    expect(catalog.byId['tarwi'].playable).toBe(false);
    expect(catalog.byId['tarwi'].lockReason).toBe('no_portion');
    expect(catalog.byId['tarwi'].toxicRawWarning).toBe(true);

    const cloned: AndeanCropsDataset = structuredClone(dataset);
    for (const entry of Object.values(cloned.crops.find((c) => c.id === 'tarwi')?.composition?.values ?? {})) {
      entry.verification = 'unverified';
    }
    const ulluco = cloned.crops.find((c) => c.id === 'ulluco');
    if (ulluco?.composition) {
      ulluco.composition.values = {};
    }
    const reasons = deriveCropAvailability(cloned, localNames, portions.portions);
    expect(reasons.byId['tarwi'].lockReason).toBe('unverified');
    expect(reasons.byId['ulluco'].playable).toBe(false);
    expect(reasons.byId['ulluco'].lockReason).toBe('no_data');

    expect(catalog.byId['ulluco'].names.es).toBe('Olluco');
    expect(catalog.byId['cape-gooseberry'].names.es).toBe('Aguaymanto');
    expect(catalog.byId['purple-corn'].names.es).toBe('Maíz morado');
    // New in v0.6.0 and absent from the local names file: the dataset supplies the Spanish name
    expect(catalog.byId['nuna'].names.es).toBe('Ñuña');
  });
});

describe('portion conversion and as-eaten nutrient calculations', () => {
  const catalog = deriveCropAvailability(dataset, localNames, portions.portions);

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

  it('converts an INS household measure to as-eaten grams: 1 medium mashua, boiled', () => {
    const rule = portions.portions['mashua'];
    // INS Table I: 62.4 g raw edible; Table II: raw = cooked x 1.11
    expect(getRawEquivalentGrams(rule, 1)).toBeCloseTo(62.4, 1);
    const nutrients = calculatePortionNutrients(catalog.byId['mashua'], rule, 1);
    expect(nutrients.energy).toBeCloseTo((32 * 62.4) / 100, 1);
    // Mashua has no calcium value in v0.6.0
    expect(nutrients.calcium).toBeNull();
  });

  it('preserves null for missing nutrients rather than converting to zero', () => {
    const potato = catalog.byId['potato'];
    const potatoNutrients = calculatePortionNutrients(potato, portions.portions['potato'], 1);
    expect(potatoNutrients.energy).toBeCloseTo(77 * 1.1, 2);
    // v0.6.0 adds a verified potato calcium value (12 mg/100 g raw)
    expect(potatoNutrients.calcium).toBeCloseTo(12 * 1.1, 2);

    // Cape gooseberry has no fibre value in v0.6.0
    const gooseberry = catalog.byId['cape-gooseberry'];
    const gooseberryNutrients = calculatePortionNutrients(
      gooseberry,
      portions.portions['cape-gooseberry'],
      1
    );
    expect(gooseberryNutrients.energy).toBeCloseTo(53 * 1.4, 2);
    expect(gooseberryNutrients.fibre).toBeNull();
  });
});

describe('evaluatePlate (scoring logic & no-data handling)', () => {
  const catalog = deriveCropAvailability(dataset, localNames, portions.portions);

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
    // Cape gooseberry has verified energy, protein, iron and calcium, but NO fibre
    const result = evaluatePlate(
      [{ cropId: 'cape-gooseberry', servings: 1 }],
      catalog.byId,
      portions.portions,
      lunchScenario,
      referenceIntakes
    );

    expect(result.isEmpty).toBe(false);
    expect(result.scoredNutrientCount).toBe(4);
    expect(result.excludedNutrientCount).toBe(1);

    expect(result.nutrients.fibre.status).toBe('no_data');
    expect(result.nutrients.fibre.total).toBeNull();
    expect(result.nutrients.fibre.score).toBeNull();
    expect(result.nutrients.fibre.missingDataCropIds).toEqual(['cape-gooseberry']);

    // Overall score must average ONLY the 4 nutrients with data, not divide by 5
    const scoredWithData = (['energy', 'protein', 'iron', 'calcium'] as const).map(
      (n) => result.nutrients[n].score ?? 0
    );
    const expectedAvg = Math.round(scoredWithData.reduce((sum, score) => sum + score, 0) / 4);
    expect(result.overallScore).toBe(expectedAvg);
  });

  it('flags partial data when some plate items have data and others lack data for a nutrient', () => {
    // Quinoa has fibre (7.0 g/100 g raw); cape gooseberry lacks fibre
    const result = evaluatePlate(
      [
        { cropId: 'quinoa', servings: 1 },
        { cropId: 'cape-gooseberry', servings: 1 },
      ],
      catalog.byId,
      portions.portions,
      lunchScenario,
      referenceIntakes
    );

    expect(result.nutrients.fibre.status).not.toBe('no_data');
    expect(result.nutrients.fibre.hasPartialData).toBe(true);
    expect(result.nutrients.fibre.missingDataCropIds).toEqual(['cape-gooseberry']);
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
