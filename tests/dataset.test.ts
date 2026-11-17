/**
 * Checks on the real pinned snapshot in `data/andean-crops/`.
 *
 * The expected crop lists describe dataset v0.3.0 (SPEC section 5). When the
 * pin moves to a release that verifies more crops, update them here.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { adaptDataset } from '../build/adapt-dataset.ts';
import { DATA_PATHS, validateAgainstSchema } from '../build/game-data.ts';
import { classifyCrop } from '../src/domain/catalogue.ts';

const REPO = join(import.meta.dirname, '..');
const read = (path: string) => readFileSync(join(REPO, path), 'utf8');

const datasetText = read(DATA_PATHS.dataset);
const dataset: unknown = JSON.parse(datasetText);
const pin = JSON.parse(read(DATA_PATHS.pin)) as { version: string; sha256: string };
const adapted = adaptDataset(dataset);
const byId = Object.fromEntries(adapted.crops.map((crop) => [crop.id, crop]));

function idsWhere(kind: 'playable' | 'unverified' | 'no_values'): string[] {
  return adapted.crops
    .filter((crop) => {
      const status = classifyCrop(crop);
      return status.kind === 'playable' ? kind === 'playable' : status.reason === kind;
    })
    .map((crop) => crop.id)
    .sort();
}

describe('pinned dataset snapshot', () => {
  it('matches the consumer contract schema', () => {
    const schema: unknown = JSON.parse(read(DATA_PATHS.datasetSchema));
    expect(validateAgainstSchema(dataset, schema, 'dataset')).toEqual([]);
  });

  it('matches the pinned checksum and version', () => {
    expect(createHash('sha256').update(datasetText).digest('hex')).toBe(pin.sha256);
    expect(adapted.version).toBe(pin.version);
    expect(adapted.version).toBe('0.3.0');
  });

  it('yields the nine playable crops of v0.3.0', () => {
    expect(idsWhere('playable')).toEqual([
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
  });

  it('locks the six crops with unverified values', () => {
    expect(idsWhere('unverified')).toEqual([
      'canihua',
      'maca',
      'mashua',
      'oca',
      'purple-corn',
      'tarwi',
    ]);
  });

  it('locks the crops that have no values yet', () => {
    const noValues = idsWhere('no_values');
    expect(noValues).toHaveLength(15);
    expect(noValues).toContain('chuno');
    expect(noValues).toContain('ulluco');
  });

  it('marks kiwicha and cape gooseberry as proxy matches', () => {
    expect(adapted.crops.filter((crop) => crop.isProxy).map((crop) => crop.id)).toEqual([
      'kiwicha',
      'cape-gooseberry',
    ]);
  });

  it('keeps the gaps in playable crops as "no data", not zero', () => {
    expect(byId['potato']?.per100gRaw.calcium).toBeNull();
    expect(byId['lima-bean']?.per100gRaw.iron).toBeNull();
    expect(byId['common-bean']?.per100gRaw.iron).toBeNull();
    expect(byId['cape-gooseberry']?.per100gRaw.fibre).toBeNull();
    expect(byId['naranjilla']?.per100gRaw).toEqual({
      energy: 25,
      protein: 0.44,
      fibre: null,
      iron: null,
      calcium: null,
    });
  });

  it('reads quinoa in game units', () => {
    expect(byId['quinoa']?.per100gRaw).toEqual({
      energy: 368,
      protein: 14.12,
      fibre: 7,
      iron: 4.57,
      calcium: 47,
    });
  });

  it('carries the "not eaten raw" flag for tarwi only', () => {
    expect(adapted.crops.filter((crop) => crop.notEatenRaw).map((crop) => crop.id)).toEqual([
      'tarwi',
    ]);
  });

  it('has exactly one Spanish name per crop', () => {
    const names = JSON.parse(read(DATA_PATHS.localNames)) as { names: Record<string, unknown> };
    expect(Object.keys(names.names).sort()).toEqual(adapted.crops.map((crop) => crop.id).sort());
  });
});
