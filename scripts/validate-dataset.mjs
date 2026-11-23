import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const SCORED_NUTRIENTS = ['energy', 'protein', 'fibre', 'iron', 'calcium'];
const PLAYABLE_VERIFICATIONS = new Set(['corroborated', 'verified']);

function readJson(relPath) {
  const fullPath = path.join(rootDir, relPath);
  const raw = fs.readFileSync(fullPath, 'utf8');
  return JSON.parse(raw);
}

function fail(message) {
  console.error(`[validate-dataset] ERROR: ${message}`);
  process.exit(1);
}

function main() {
  const dataset = readJson('src/data/andean-crops.json');
  const schema = readJson('src/data/andean-crops.schema.json');
  const portions = readJson('src/data/portions.json');
  const localNames = readJson('src/data/local-names.json');
  const referenceIntakes = readJson('src/data/reference-intakes.json');

  // 1. Validate dataset against its pinned JSON Schema (Draft 2020-12)
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(dataset);
  if (!valid) {
    const details = (validate.errors || [])
      .map((err) => `  - ${err.instancePath || '/'} ${err.message}`)
      .join('\n');
    fail(`andean-crops.json failed schema validation:\n${details}`);
  }

  // 2. Cross-reference checks: components, sources, unique crop IDs
  const componentIds = new Set(dataset.components.map((c) => c.id));
  const sourceIds = new Set(dataset.sources.map((s) => s.id));
  const cropIds = new Set();

  for (const nutrient of SCORED_NUTRIENTS) {
    if (!componentIds.has(nutrient)) {
      fail(`Required scored nutrient "${nutrient}" missing from dataset.components`);
    }
  }

  const derivedPlayableIds = [];

  for (const crop of dataset.crops) {
    if (cropIds.has(crop.id)) {
      fail(`Duplicate crop id "${crop.id}"`);
    }
    cropIds.add(crop.id);

    if (crop.composition) {
      if (crop.composition.source && !sourceIds.has(crop.composition.source)) {
        fail(`Crop "${crop.id}" references unknown composition source "${crop.composition.source}"`);
      }
      const values = crop.composition.values || {};
      let hasPlayableNutrient = false;
      for (const [compId, entry] of Object.entries(values)) {
        if (!componentIds.has(compId)) {
          fail(`Crop "${crop.id}" has unknown component "${compId}"`);
        }
        if (SCORED_NUTRIENTS.includes(compId) && PLAYABLE_VERIFICATIONS.has(entry.verification)) {
          hasPlayableNutrient = true;
        }
      }
      if (hasPlayableNutrient) {
        derivedPlayableIds.push(crop.id);
      }
    }

    // Verify local image asset exists for offline play
    if (crop.image && crop.image.file) {
      const imgPath = path.join(rootDir, 'public', crop.image.file);
      if (!fs.existsSync(imgPath)) {
        fail(`Missing pinned image asset for "${crop.id}": public/${crop.image.file}`);
      }
    }

    // Verify Spanish local name entry exists
    if (!localNames.crops[crop.id]?.es) {
      fail(`Missing Spanish local name for crop "${crop.id}" in src/data/local-names.json`);
    }
  }

  // 3. Verify every derived playable crop has a sourced portion & cooked-yield factor
  for (const playableId of derivedPlayableIds) {
    const portion = portions.portions[playableId];
    if (!portion) {
      fail(`Playable crop "${playableId}" is missing from src/data/portions.json`);
    }
    if (typeof portion.servingGrams !== 'number' || portion.servingGrams <= 0) {
      fail(`Invalid servingGrams for "${playableId}"`);
    }
    if (typeof portion.cookedYieldFactor !== 'number' || portion.cookedYieldFactor <= 0) {
      fail(`Invalid cookedYieldFactor for "${playableId}"`);
    }
    if (!portion.isAssumption || !portion.servingSource || !portion.yieldSource) {
      fail(`Portion for "${playableId}" must be flagged as an assumption with explicit servingSource and yieldSource`);
    }
  }

  // 4. Verify reference intakes cover all 5 scored nutrients with citations
  for (const nutrient of SCORED_NUTRIENTS) {
    const entry = referenceIntakes.nutrients[nutrient];
    if (!entry || typeof entry.dailyTarget !== 'number' || entry.dailyTarget <= 0 || !entry.source) {
      fail(`Reference intake for "${nutrient}" missing or unsourced in src/data/reference-intakes.json`);
    }
  }

  console.log(
    `[validate-dataset] OK — dataset v${dataset.metadata.version} (${dataset.metadata.date}), ` +
      `${dataset.crops.length} crops (${derivedPlayableIds.length} playable, ${dataset.crops.length - derivedPlayableIds.length} locked).`
  );
}

main();
