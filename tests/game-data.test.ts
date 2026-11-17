/**
 * Build-time loading and validation, exercised on a synthetic repository root.
 * Every value below is invented; none of it is nutrition data.
 */
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  DATA_PATHS,
  GameDataError,
  loadGameData,
  validateAgainstSchema,
} from '../build/game-data.ts';

const REPO = join(import.meta.dirname, '..');
const SOURCE = { citation: 'Synthetic test value, not a real source' };

type Json = Record<string, any>;
type Files = Record<keyof typeof DATA_PATHS, Json>;

function schema(name: string): unknown {
  return JSON.parse(readFileSync(join(REPO, 'data/game/schemas', `${name}.schema.json`), 'utf8'));
}

const value = (amount: number, verification: string) => ({ value: amount, verification });
const intake = (unit: string) => ({ amountPerDay: 100, unit, source: SOURCE });
const PORTION = {
  servingGramsAsEaten: 150,
  cookedYieldFactor: 3,
  state: 'cooked',
  servingSource: SOURCE,
  yieldSource: SOURCE,
  assumption: true,
};

/** Synthetic build inputs in the real file shapes. */
function syntheticFiles(): Files {
  return {
    dataset: {
      metadata: { title: 'Synthetic', version: '9.9.9', basis: 'synthetic', verification_levels: {} },
      components: [
        { id: 'energy', unit: 'kcal' },
        { id: 'protein', unit: 'g' },
        { id: 'fibre', unit: 'g' },
        { id: 'iron', unit: 'mg' },
        { id: 'calcium', unit: 'mg' },
      ],
      crops: [
        {
          id: 'alpha',
          names: { common: 'Alpha' },
          composition: {
            match: 'proxy',
            values: {
              energy: value(400, 'verified'),
              protein: value(10, 'corroborated'),
              fibre: value(10, 'verified'),
              calcium: value(100, 'verified'),
            },
          },
          flags: [],
        },
        {
          id: 'beta',
          names: { common: 'Beta' },
          composition: { match: 'unknown', values: { energy: value(300, 'unverified') } },
          flags: [{ code: 'not-eaten-raw' }],
        },
        { id: 'gamma', names: { common: 'Gamma' }, composition: { values: {} }, flags: [] },
      ],
    },
    datasetSchema: JSON.parse(readFileSync(join(REPO, DATA_PATHS.datasetSchema), 'utf8')),
    pin: {
      name: 'Synthetic',
      version: '9.9.9',
      sourceUrl: 'https://example.invalid/data.json',
      sha256: '',
      retrievedOn: '2026-01-01',
    },
    referenceIntakes: {
      profiles: [
        {
          id: 'synthetic',
          description: { es: 'sintético', en: 'synthetic' },
          intakes: {
            energy: intake('kcal'),
            protein: intake('g'),
            fibre: intake('g'),
            iron: intake('mg'),
            calcium: intake('mg'),
          },
        },
      ],
    },
    portions: { portions: { alpha: PORTION } },
    localNames: { notice: 'synthetic', names: { alpha: { es: 'alfa' }, beta: { es: 'beta' }, gamma: { es: 'gama' } } },
    scenarios: {
      scenarios: [
        {
          id: 'synthetic',
          title: { es: 'x', en: 'x' },
          description: { es: 'x', en: 'x' },
          referenceProfileId: 'synthetic',
          mealShare: { value: 0.5, source: SOURCE, assumption: true },
        },
      ],
    },
    scoring: JSON.parse(readFileSync(join(REPO, DATA_PATHS.scoring), 'utf8')),
  };
}

const temporary: string[] = [];
afterEach(() => {
  for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Write a synthetic repository root; `edit` may change any file first. */
function makeRoot(edit: (files: Files) => void = () => {}): string {
  const root = mkdtempSync(join(tmpdir(), 'nutrition-game-'));
  temporary.push(root);
  cpSync(join(REPO, 'data/game/schemas'), join(root, 'data/game/schemas'), { recursive: true });
  const files = syntheticFiles();
  edit(files);
  const datasetText = JSON.stringify(files.dataset);
  if (files.pin['sha256'] === '') {
    files.pin['sha256'] = createHash('sha256').update(datasetText).digest('hex');
  }
  for (const key of Object.keys(files) as (keyof Files)[]) {
    const path = join(root, DATA_PATHS[key]);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, key === 'dataset' ? datasetText : JSON.stringify(files[key]));
  }
  return root;
}

function issuesOf(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    if (error instanceof GameDataError) return error.issues.join('\n');
    throw error;
  }
  throw new Error('expected a GameDataError');
}

describe('game data schemas', () => {
  it('accept the committed scoring configuration', () => {
    const scoring: unknown = JSON.parse(readFileSync(join(REPO, DATA_PATHS.scoring), 'utf8'));
    expect(validateAgainstSchema(scoring, schema('scoring'), 'scoring')).toEqual([]);
  });

  it('accept a portion with both sources and the assumption flag', () => {
    expect(validateAgainstSchema({ portions: { x: PORTION } }, schema('portions'), 'p')).toEqual([]);
  });

  it('reject a portion factor without a source', () => {
    const { yieldSource: _removed, ...unsourced } = PORTION;
    expect(
      validateAgainstSchema({ portions: { x: unsourced } }, schema('portions'), 'p'),
    ).not.toEqual([]);
  });

  it('reject a portion that is not flagged as an assumption', () => {
    const unflagged = { ...PORTION, assumption: false };
    expect(
      validateAgainstSchema({ portions: { x: unflagged } }, schema('portions'), 'p'),
    ).not.toEqual([]);
  });

  it('reject a reference intake without a citation', () => {
    const bare = { amountPerDay: 1, unit: 'g' };
    const profile = {
      id: 'x',
      description: { es: 'x', en: 'x' },
      intakes: { energy: bare, protein: bare, fibre: bare, iron: bare, calcium: bare },
    };
    expect(
      validateAgainstSchema({ profiles: [profile] }, schema('reference-intakes'), 'r'),
    ).not.toEqual([]);
  });
});

describe('loadGameData', () => {
  it('assembles the bundle from valid inputs', () => {
    const data = loadGameData(makeRoot());
    expect(data.dataset).toMatchObject({ name: 'Synthetic', version: '9.9.9' });
    expect(data.foods).toEqual([
      {
        id: 'alpha',
        status: 'playable',
        names: { en: 'Alpha', es: 'alfa' },
        isProxy: true,
        portion: PORTION,
        // 150 g cooked at yield 3 is 50 g raw. Iron is absent, so it stays "no data".
        perServing: { energy: 200, protein: 5, fibre: 5, iron: null, calcium: 50 },
      },
      { id: 'beta', status: 'locked', names: { en: 'Beta', es: 'beta' }, lockReason: 'unverified' },
      { id: 'gamma', status: 'locked', names: { en: 'Gamma', es: 'gama' }, lockReason: 'no_values' },
    ]);
    expect(data.scenarios).toHaveLength(1);
  });

  it('lists every missing build input', () => {
    const root = mkdtempSync(join(tmpdir(), 'nutrition-game-'));
    temporary.push(root);
    const issues = issuesOf(() => loadGameData(root)).split('\n');
    expect(issues).toHaveLength(Object.keys(DATA_PATHS).length);
    expect(issues[0]).toContain('missing build input: data/andean-crops/andean-crops.json');
  });

  it('fails when the snapshot does not match the schema', () => {
    const root = makeRoot((files) => {
      files.dataset['metadata'].version = 3;
      delete files.dataset['crops'][0].composition;
    });
    const issues = issuesOf(() => loadGameData(root));
    expect(issues).toContain('data/andean-crops/andean-crops.json/metadata/version');
    expect(issues).toContain('data/andean-crops/andean-crops.json/crops/0');
  });

  it('fails when the dataset changes a scored unit', () => {
    const root = makeRoot((files) => {
      files.dataset['components'][0].unit = 'kJ';
    });
    expect(issuesOf(() => loadGameData(root))).toContain(
      'data/andean-crops/andean-crops.json/components',
    );
  });

  it('fails on a verification level the game does not know', () => {
    const root = makeRoot((files) => {
      files.dataset['crops'][0].composition.values.energy.verification = 'peer-reviewed';
    });
    expect(issuesOf(() => loadGameData(root))).toContain('/crops/0/composition/values/energy');
  });

  it('fails when the snapshot differs from its pinned checksum', () => {
    const root = makeRoot((files) => {
      files.pin['sha256'] = '0'.repeat(64);
    });
    expect(issuesOf(() => loadGameData(root))).toContain('pinned sha256');
  });

  it('fails when the snapshot reports another version than the pin', () => {
    const root = makeRoot((files) => {
      files.pin['version'] = '1.0.0';
    });
    expect(issuesOf(() => loadGameData(root))).toContain('pins 1.0.0');
  });

  it('fails when a reference intake uses the wrong unit', () => {
    const root = makeRoot((files) => {
      files.referenceIntakes['profiles'][0].intakes.iron.unit = 'g';
    });
    expect(issuesOf(() => loadGameData(root))).toContain('iron must be in mg, got g');
  });

  it('fails when a scenario names an unknown reference profile', () => {
    const root = makeRoot((files) => {
      files.scenarios['scenarios'][0].referenceProfileId = 'nobody';
    });
    expect(issuesOf(() => loadGameData(root))).toContain('unknown reference profile "nobody"');
  });

  it('fails when a playable crop has no sourced portion', () => {
    const root = makeRoot((files) => {
      files.portions['portions'] = {};
    });
    expect(() => loadGameData(root)).toThrow(/"alpha" has no sourced portion/);
  });

  it('fails when a crop flagged as not eaten raw gets an uncooked portion', () => {
    const root = makeRoot((files) => {
      files.dataset['crops'][1].composition.values.energy.verification = 'verified';
      files.portions['portions'].beta = { ...PORTION, state: 'uncooked', cookedYieldFactor: 1 };
    });
    expect(() => loadGameData(root)).toThrow(/"beta" is flagged as not eaten raw/);
  });
});
