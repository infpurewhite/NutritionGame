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

function schema(name: string): unknown {
  return JSON.parse(readFileSync(join(REPO, 'data/game/schemas', `${name}.schema.json`), 'utf8'));
}

const temporary: string[] = [];
afterEach(() => {
  for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A synthetic repository root holding every build input. */
function makeRoot(overrides: Partial<Record<keyof typeof DATA_PATHS, unknown>> = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'nutrition-game-'));
  temporary.push(root);
  cpSync(join(REPO, 'data/game/schemas'), join(root, 'data/game/schemas'), { recursive: true });

  const dataset = JSON.stringify(overrides.dataset ?? { version: '9.9.9', crops: [] });
  const intake = (unit: string) => ({ amountPerDay: 1, unit, source: SOURCE });
  const files: Record<keyof typeof DATA_PATHS, unknown> = {
    dataset: null,
    datasetSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      required: ['version', 'crops'],
      properties: { version: { type: 'string' }, crops: { type: 'array' } },
    },
    pin: {
      name: 'synthetic',
      version: '9.9.9',
      sourceUrl: 'https://example.invalid/data.json',
      sha256: createHash('sha256').update(dataset).digest('hex'),
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
    portions: { portions: {} },
    localNames: { notice: 'synthetic', names: {} },
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
    ...overrides,
  };
  for (const [key, value] of Object.entries(files)) {
    const path = join(root, DATA_PATHS[key as keyof typeof DATA_PATHS]);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, key === 'dataset' ? dataset : JSON.stringify(value));
  }
  return root;
}

function issuesOf(action: () => unknown): readonly string[] {
  try {
    action();
  } catch (error) {
    if (error instanceof GameDataError) return error.issues;
    throw error;
  }
  throw new Error('expected a GameDataError');
}

describe('game data schemas', () => {
  it('accept the committed scoring configuration', () => {
    const scoring = JSON.parse(readFileSync(join(REPO, DATA_PATHS.scoring), 'utf8'));
    expect(validateAgainstSchema(scoring, schema('scoring'), 'scoring')).toEqual([]);
  });

  const portion = {
    servingGramsAsEaten: 150,
    cookedYieldFactor: 3,
    state: 'cooked',
    servingSource: SOURCE,
    yieldSource: SOURCE,
    assumption: true,
  };

  it('accept a portion with both sources and the assumption flag', () => {
    expect(validateAgainstSchema({ portions: { x: portion } }, schema('portions'), 'p')).toEqual([]);
  });

  it('reject a portion factor without a source', () => {
    const { yieldSource: _removed, ...unsourced } = portion;
    expect(
      validateAgainstSchema({ portions: { x: unsourced } }, schema('portions'), 'p'),
    ).not.toEqual([]);
  });

  it('reject a portion that is not flagged as an assumption', () => {
    const unflagged = { ...portion, assumption: false };
    expect(
      validateAgainstSchema({ portions: { x: unflagged } }, schema('portions'), 'p'),
    ).not.toEqual([]);
  });

  it('reject a reference intake without a citation', () => {
    const intake = { amountPerDay: 1, unit: 'g' };
    const profile = {
      id: 'x',
      description: { es: 'x', en: 'x' },
      intakes: { energy: intake, protein: intake, fibre: intake, iron: intake, calcium: intake },
    };
    expect(
      validateAgainstSchema({ profiles: [profile] }, schema('reference-intakes'), 'r'),
    ).not.toEqual([]);
  });
});

describe('loadGameData', () => {
  it('lists every missing build input', () => {
    const root = mkdtempSync(join(tmpdir(), 'nutrition-game-'));
    temporary.push(root);
    const issues = issuesOf(() => loadGameData(root));
    expect(issues).toHaveLength(Object.keys(DATA_PATHS).length);
    expect(issues[0]).toContain('missing build input: data/andean-crops/andean-crops.json');
  });

  it('fails when the snapshot does not match its schema', () => {
    const root = makeRoot({ dataset: { version: 3, crops: 'none' } });
    const issues = issuesOf(() => loadGameData(root)).join('\n');
    expect(issues).toContain('data/andean-crops/andean-crops.json/version');
    expect(issues).toContain('data/andean-crops/andean-crops.json/crops');
  });

  it('fails when the snapshot differs from its pinned checksum', () => {
    const root = makeRoot();
    writeFileSync(
      join(root, DATA_PATHS.dataset),
      JSON.stringify({ version: '9.9.9', crops: [], edited: true }),
    );
    expect(issuesOf(() => loadGameData(root)).join('\n')).toContain('pinned sha256');
  });

  it('reaches the dataset adapter once every file validates', () => {
    // The adapter is not written yet (see build/adapt-dataset.ts). Replace this
    // test with end-to-end assertions when it is.
    const root = makeRoot();
    expect(() => loadGameData(root)).toThrow(/adaptDataset is not implemented/);
  });
});
