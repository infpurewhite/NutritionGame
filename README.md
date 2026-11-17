# NutritionGame

A plate-builder game that teaches adults to build a balanced plate from Andean
ingredients. Spanish and English. Design spec: [SPEC.md](SPEC.md).

**Prototype.** A nutritionist has not yet reviewed the content.
For research and teaching, not dietary or medical advice.

## Status: first milestone (SPEC section 12)

| Item | State |
| --- | --- |
| Scoring on the five nutrients, with "no data" handling | Done, tested |
| Playable/locked derivation from verification levels | Done, tested |
| Portion layer (as-eaten serving from raw per-100 g values) | Logic done, tested; factors not yet sourced |
| Spanish and English string tables | Done, tested |
| Build-time validation of the dataset and game data | Done, tested |
| Dataset snapshot copied into the repo | **Pending** |
| Dataset adapter (`build/adapt-dataset.ts`) | **Pending**: needs the snapshot |
| FAO/WHO reference intakes with citations | **Pending**: not yet verified against the sources |
| Scenario, Spanish food names | **Pending** |
| GitHub Pages deployment | Workflow written; runs on `main` once the build passes |

`npm run build` fails until every pending data file is present and valid.
That is intended: the build is the gate for the spec's "do not invent values" rules.

## Run it

Requires Node 22.18 or later.

```bash
npm ci
```

```bash
npm test
```

```bash
npm run dev:fixture
```

`dev:fixture` runs the game on a synthetic fixture (`tests/fixtures/`), so the
interface can be exercised before the real data is in place. Every food and
number in the fixture is invented. `npm run dev` and `npm run build` use the
real data only.

```bash
npm run data:validate
```

`data:validate` runs the build-time data checks alone and lists what is missing.

## How the data flows

```
data/andean-crops/andean-crops.json         pinned dataset snapshot (copied, never fetched at run time)
data/andean-crops/andean-crops.schema.json  its JSON Schema
data/andean-crops/PIN.json                  name, version, source URL, sha256, retrieval date
data/game/reference-intakes.json            daily reference intakes, each with its citation
data/game/portions.json                     serving size and cooked-yield factor per food, each sourced
data/game/local-names.json                  Spanish and local food names (until the dataset has them)
data/game/scenarios.json                    scenarios, each with a reference profile and a meal share
data/game/scoring.json                      scoring bands (game-design parameters)
data/game/schemas/                          JSON Schemas for the files above
        │
        ▼  build/game-data.ts (run by Vite at build time)
virtual:game-data                           validated bundle imported by the app
```

The build fails when:

- the snapshot does not match its schema, or its sha256 differs from `PIN.json`;
- a reference intake has no citation, or a portion factor has no source or is not flagged as an assumption;
- a playable crop has no sourced portion, or a crop has no Spanish name;
- a crop carries a verification level the code does not know.

## Rules the code enforces

- **Playable or locked** is derived from the dataset's verification levels
  (`src/domain/catalogue.ts`): `corroborated` or `verified` is playable;
  `unverified`, or no values, is a locked "coming soon" card. A crop with mixed
  levels stays locked. Locked cards carry no nutrient values.
- **"No data" is never zero** (`src/domain/scoring.ts`). A missing value is
  left out of that nutrient's total and the food is named. If no food on the
  plate has data for a nutrient, the nutrient gets no score and is left out of
  the overall score.
- **Scoring uses the as-eaten portion** (`src/domain/portions.ts`):
  raw-equivalent weight = serving weight / cooked-yield factor. Nutrients are
  assumed to be fully retained on cooking.
- **All interface text** is in `src/i18n/en.ts` and `src/i18n/es.ts`.

## Layout

```
src/domain/   pure logic: types, catalogue, portions, scoring
src/i18n/     string tables
src/ui/       Preact components
build/        build-time data loading, validation and the Vite plugin
data/         dataset snapshot and game data files
tests/        Vitest tests and the synthetic fixture
```

## Licences

Code: MIT ([LICENSE](LICENSE)). Game content and text: CC BY 4.0
([LICENSE-CONTENT.md](LICENSE-CONTENT.md)).
