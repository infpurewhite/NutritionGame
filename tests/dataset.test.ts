/**
 * Checks on the real pinned snapshot in `data/andean-crops/`.
 *
 * The expected values describe dataset v0.6.0. When the pin moves to another
 * release, update them here.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { adaptDataset } from '../build/adapt-dataset.ts';
import { DATA_PATHS, validateAgainstSchema } from '../build/game-data.ts';
import { NEVER_RAW_CROP_IDS, classifyCrop } from '../src/domain/catalogue.ts';

const REPO = join(import.meta.dirname, '..');
const read = (path: string) => readFileSync(join(REPO, path), 'utf8');

const datasetText = read(DATA_PATHS.dataset);
const dataset: unknown = JSON.parse(datasetText);
const pin = JSON.parse(read(DATA_PATHS.pin)) as { version: string; sha256: string };
const adapted = adaptDataset(dataset);
const byId = Object.fromEntries(adapted.crops.map((crop) => [crop.id, crop]));

describe('pinned dataset snapshot', () => {
  it('matches the consumer contract schema', () => {
    const schema: unknown = JSON.parse(read(DATA_PATHS.datasetSchema));
    expect(validateAgainstSchema(dataset, schema, 'dataset')).toEqual([]);
  });

  it('matches the pinned checksum and version', () => {
    expect(createHash('sha256').update(datasetText).digest('hex')).toBe(pin.sha256);
    expect(adapted.version).toBe(pin.version);
    expect(adapted.version).toBe('0.6.0');
  });

  it('has 35 crops, every one with verified values for the scored nutrients', () => {
    expect(adapted.crops).toHaveLength(35);
    for (const crop of adapted.crops) {
      expect(crop.verificationLevels, crop.id).toEqual(['verified']);
      expect(classifyCrop(crop), crop.id).toEqual({ kind: 'playable' });
    }
  });

  it('marks kiwicha, cape gooseberry, Andean blackberry and elderberry as proxy matches', () => {
    expect(adapted.crops.filter((crop) => crop.isProxy).map((crop) => crop.id)).toEqual([
      'kiwicha',
      'cape-gooseberry',
      'mora',
      'sauco',
    ]);
  });

  it('keeps the remaining gaps as "no data", not zero', () => {
    expect(byId['cape-gooseberry']?.per100gRaw.fibre).toBeNull();
    expect(byId['sacha-inchi']?.per100gRaw.iron).toBeNull();
    expect(byId['mashua']?.per100gRaw.calcium).toBeNull();
    // Gaps that v0.6.0 filled
    expect(byId['potato']?.per100gRaw.calcium).toBe(12);
    expect(byId['lima-bean']?.per100gRaw.iron).toBe(7.51);
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

  it('takes Spanish names from the dataset', () => {
    expect(byId['ulluco']?.nameEs).toBe('Olluco');
    expect(byId['cape-gooseberry']?.nameEs).toBe('Aguaymanto');
    expect(byId['purple-corn']?.nameEs).toBe('Maíz morado');
    expect(byId['nuna']?.nameEs).toBe('Ñuña');
  });

  it('no longer flags tarwi as "not eaten raw", so the game rule must cover it', () => {
    expect(adapted.crops.filter((crop) => crop.notEatenRaw)).toEqual([]);
    expect(NEVER_RAW_CROP_IDS).toContain('tarwi');
  });
});
