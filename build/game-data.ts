/**
 * Build-time assembly of the game data (SPEC sections 5 to 7).
 *
 * Reads the pinned dataset snapshot and the game-side data files, validates
 * each against its JSON Schema, derives the playable/locked split and returns
 * the bundle the app imports. Any problem throws, which fails the build.
 * Nothing here runs in the browser and nothing is fetched at run time.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Ajv } from 'ajv';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import { buildCatalogue } from '../src/domain/catalogue.ts';
import { NUTRIENT_IDS, NUTRIENT_UNITS } from '../src/domain/types.ts';
import type {
  GameData,
  PortionSpec,
  ReferenceProfile,
  Scenario,
  ScoringConfig,
} from '../src/domain/types.ts';
import { adaptDataset } from './adapt-dataset.ts';

/** Repository-relative paths of every build input. */
export const DATA_PATHS = {
  dataset: 'data/andean-crops/andean-crops.json',
  datasetSchema: 'data/andean-crops/andean-crops.schema.json',
  pin: 'data/andean-crops/PIN.json',
  referenceIntakes: 'data/game/reference-intakes.json',
  portions: 'data/game/portions.json',
  localNames: 'data/game/local-names.json',
  scenarios: 'data/game/scenarios.json',
  scoring: 'data/game/scoring.json',
} as const;

const GAME_SCHEMAS = {
  pin: 'data/game/schemas/pin.schema.json',
  referenceIntakes: 'data/game/schemas/reference-intakes.schema.json',
  portions: 'data/game/schemas/portions.schema.json',
  localNames: 'data/game/schemas/local-names.schema.json',
  scenarios: 'data/game/schemas/scenarios.schema.json',
  scoring: 'data/game/schemas/scoring.schema.json',
} as const;

export class GameDataError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Game data is not ready:\n- ${issues.join('\n- ')}`);
    this.name = 'GameDataError';
    this.issues = issues;
  }
}

interface Pin {
  readonly name: string;
  readonly version: string;
  readonly sourceUrl: string;
  readonly sha256: string;
}

function readJson(root: string, relativePath: string): unknown {
  const text = readFileSync(join(root, relativePath), 'utf8');
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new GameDataError([`${relativePath} is not valid JSON: ${String(error)}`]);
  }
}

/** Validate `data` against `schema`, choosing the Ajv build from the schema's draft. */
export function validateAgainstSchema(
  data: unknown,
  schema: unknown,
  label: string,
): string[] {
  const draft =
    typeof schema === 'object' && schema !== null && '$schema' in schema
      ? String((schema as { $schema: unknown }).$schema)
      : '';
  const options = { allErrors: true, strict: false } as const;
  const ajv = draft.includes('2020-12') ? new Ajv2020(options) : new Ajv(options);
  addFormats(ajv);
  const validate = ajv.compile(schema as object);
  if (validate(data)) return [];
  return (validate.errors ?? []).map(
    (error) => `${label}${error.instancePath || '/'}: ${error.message ?? 'schema mismatch'}`,
  );
}

function checkedGameFile<T>(
  root: string,
  key: keyof typeof GAME_SCHEMAS,
  issues: string[],
): T | null {
  const path = DATA_PATHS[key];
  const data = readJson(root, path);
  const errors = validateAgainstSchema(data, readJson(root, GAME_SCHEMAS[key]), path);
  if (errors.length > 0) {
    issues.push(...errors);
    return null;
  }
  return data as T;
}

/**
 * Load, validate and assemble the game data from `root` (the repository root).
 *
 * @throws GameDataError listing every missing input or failed check.
 */
export function loadGameData(root: string): GameData {
  const missing = Object.values(DATA_PATHS).filter((path) => !existsSync(join(root, path)));
  if (missing.length > 0) {
    throw new GameDataError(missing.map((path) => `missing build input: ${path}`));
  }

  const issues: string[] = [];

  // 1. Dataset snapshot: schema match and pin integrity.
  const datasetText = readFileSync(join(root, DATA_PATHS.dataset), 'utf8');
  const dataset = readJson(root, DATA_PATHS.dataset);
  issues.push(
    ...validateAgainstSchema(dataset, readJson(root, DATA_PATHS.datasetSchema), DATA_PATHS.dataset),
  );
  const pin = checkedGameFile<Pin>(root, 'pin', issues);
  const sha256 = createHash('sha256').update(datasetText).digest('hex');
  if (pin !== null && pin.sha256 !== sha256) {
    issues.push(
      `${DATA_PATHS.dataset} does not match the pinned sha256 in ${DATA_PATHS.pin} ` +
        `(expected ${pin.sha256}, got ${sha256})`,
    );
  }

  // 2. Game-side files.
  const intakes = checkedGameFile<{ profiles: ReferenceProfile[] }>(
    root,
    'referenceIntakes',
    issues,
  );
  const portions = checkedGameFile<{ portions: Record<string, PortionSpec> }>(
    root,
    'portions',
    issues,
  );
  const names = checkedGameFile<{ names: Record<string, { es: string }> }>(
    root,
    'localNames',
    issues,
  );
  const scenarios = checkedGameFile<{ scenarios: Scenario[] }>(root, 'scenarios', issues);
  const scoring = checkedGameFile<ScoringConfig>(root, 'scoring', issues);

  if (
    issues.length > 0 ||
    pin === null ||
    intakes === null ||
    portions === null ||
    names === null ||
    scenarios === null ||
    scoring === null
  ) {
    throw new GameDataError(issues);
  }

  // 3. Cross-file checks.
  const adapted = adaptDataset(dataset);
  if (adapted.version !== pin.version) {
    issues.push(
      `dataset reports version ${adapted.version} but ${DATA_PATHS.pin} pins ${pin.version}`,
    );
  }
  for (const profile of intakes.profiles) {
    for (const id of NUTRIENT_IDS) {
      const unit = profile.intakes[id].unit;
      if (unit !== NUTRIENT_UNITS[id]) {
        issues.push(
          `reference profile "${profile.id}": ${id} must be in ${NUTRIENT_UNITS[id]}, got ${unit}`,
        );
      }
    }
  }
  const profileIds = new Set(intakes.profiles.map((profile) => profile.id));
  for (const scenario of scenarios.scenarios) {
    if (!profileIds.has(scenario.referenceProfileId)) {
      issues.push(
        `scenario "${scenario.id}" refers to unknown reference profile "${scenario.referenceProfileId}"`,
      );
    }
  }
  if (issues.length > 0) throw new GameDataError(issues);

  const spanishNames = Object.fromEntries(
    Object.entries(names.names).map(([id, entry]) => [id, entry.es]),
  );
  const foods = buildCatalogue(adapted.crops, portions.portions, spanishNames);

  return {
    dataset: { name: pin.name, version: pin.version, sourceUrl: pin.sourceUrl, sha256 },
    foods,
    scenarios: scenarios.scenarios,
    referenceProfiles: intakes.profiles,
    scoring,
  };
}
