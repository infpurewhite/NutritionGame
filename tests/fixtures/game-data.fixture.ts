/**
 * SYNTHETIC FIXTURE. Every food, number and citation in this file is invented
 * for tests and for `npm run dev:fixture`. None of it is nutrition data, and a
 * production build never includes it.
 */
import { buildCatalogue } from '../../src/domain/catalogue.ts';
import type {
  CropRecord,
  GameData,
  PortionSpec,
  ReferenceProfile,
  Scenario,
  ScoringConfig,
  SourceRef,
} from '../../src/domain/types.ts';

const SYNTHETIC: SourceRef = { citation: 'Synthetic test value, not a real source' };

function portion(
  servingGramsAsEaten: number,
  cookedYieldFactor: number,
  state: PortionSpec['state'],
): PortionSpec {
  return {
    servingGramsAsEaten,
    cookedYieldFactor,
    state,
    servingSource: SYNTHETIC,
    yieldSource: SYNTHETIC,
    assumption: true,
  };
}

export const FIXTURE_CROPS: readonly CropRecord[] = [
  {
    id: 'fixture-grain',
    nameEn: 'Fixture grain (synthetic)',
    per100gRaw: { energy: 400, protein: 10, fibre: 10, iron: 10, calcium: 100 },
    verificationLevels: ['verified'],
    isProxy: false,
    notEatenRaw: false,
  },
  {
    id: 'fixture-tuber',
    nameEn: 'Fixture tuber (synthetic)',
    per100gRaw: { energy: 100, protein: 2, fibre: 2, iron: 1, calcium: 10 },
    verificationLevels: ['corroborated'],
    isProxy: false,
    notEatenRaw: false,
  },
  {
    id: 'fixture-fruit',
    nameEn: 'Fixture fruit (synthetic)',
    per100gRaw: { energy: 50, protein: 1, fibre: 5, iron: null, calcium: 20 },
    verificationLevels: ['corroborated'],
    isProxy: true,
    notEatenRaw: false,
  },
  {
    id: 'fixture-legume',
    nameEn: 'Fixture legume (synthetic)',
    per100gRaw: { energy: 300, protein: 20, fibre: 15, iron: 5, calcium: 80 },
    verificationLevels: ['unverified'],
    isProxy: false,
    notEatenRaw: false,
  },
  {
    id: 'fixture-root',
    nameEn: 'Fixture root (synthetic)',
    per100gRaw: { energy: null, protein: null, fibre: null, iron: null, calcium: null },
    verificationLevels: [],
    isProxy: false,
    notEatenRaw: false,
  },
];

export const FIXTURE_PORTIONS: Readonly<Record<string, PortionSpec>> = {
  'fixture-grain': portion(150, 3, 'cooked'),
  'fixture-tuber': portion(200, 1, 'cooked'),
  'fixture-fruit': portion(100, 1, 'uncooked'),
};

export const FIXTURE_SPANISH_NAMES: Readonly<Record<string, string>> = {
  'fixture-grain': 'Grano de prueba (sintético)',
  'fixture-tuber': 'Tubérculo de prueba (sintético)',
  'fixture-fruit': 'Fruta de prueba (sintética)',
  'fixture-legume': 'Legumbre de prueba (sintética)',
  'fixture-root': 'Raíz de prueba (sintética)',
};

export const FIXTURE_PROFILE: ReferenceProfile = {
  id: 'fixture-adult',
  description: { en: 'a synthetic test adult', es: 'un adulto de prueba sintético' },
  intakes: {
    energy: { amountPerDay: 2000, unit: 'kcal', source: SYNTHETIC },
    protein: { amountPerDay: 50, unit: 'g', source: SYNTHETIC },
    fibre: { amountPerDay: 20, unit: 'g', source: SYNTHETIC },
    iron: { amountPerDay: 20, unit: 'mg', source: SYNTHETIC },
    calcium: { amountPerDay: 1000, unit: 'mg', source: SYNTHETIC },
  },
};

export const FIXTURE_SCENARIO: Scenario = {
  id: 'fixture-meal',
  title: { en: 'Synthetic test meal', es: 'Comida de prueba sintética' },
  description: {
    en: 'Fixture data only: these foods and numbers are invented for testing.',
    es: 'Solo datos de prueba: estos alimentos y números son inventados.',
  },
  referenceProfileId: 'fixture-adult',
  mealShare: { value: 0.5, source: SYNTHETIC, assumption: true },
};

export const FIXTURE_SCORING: ScoringConfig = {
  note: 'Synthetic test configuration.',
  bands: {
    energy: { kind: 'range', tolerance: 0.1 },
    protein: { kind: 'at_least' },
    fibre: { kind: 'at_least' },
    iron: { kind: 'at_least' },
    calcium: { kind: 'at_least' },
  },
};

const fixture: GameData = {
  dataset: {
    name: 'synthetic fixture (not the andean-crops dataset)',
    version: '0.0.0-fixture',
    sourceUrl: 'https://example.invalid/fixture',
    sha256: '0'.repeat(64),
  },
  foods: buildCatalogue(FIXTURE_CROPS, FIXTURE_PORTIONS, FIXTURE_SPANISH_NAMES),
  scenarios: [FIXTURE_SCENARIO],
  referenceProfiles: [FIXTURE_PROFILE],
  scoring: FIXTURE_SCORING,
};

export default fixture;
