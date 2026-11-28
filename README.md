# NutritionGame

A plate-builder game that teaches adults to build a balanced plate from Andean
ingredients. Spanish and English. Design spec: [SPEC.md](SPEC.md).

**Prototype.** A nutritionist has not yet reviewed the content.
For research and teaching, not dietary or medical advice.

This branch is **version B** of two independent implementations of the same
spec. Version A is on `main`. Both are published side by side at
<https://anniececy.com/plato-andino/> (a static copy in the `anniececy-web`
repository; see `plato-andino/SOURCE.txt` there).

## Status: first milestone (SPEC section 12)

| Item | State |
| --- | --- |
| Dataset snapshot copied, validated and loaded (v0.6.0) | Done, tested on the real file |
| Playable/locked derivation | Done: all 35 crops verified; the 9 with sourced portions are playable, 26 wait for a portion |
| Scoring on the five nutrients, with "no data" handling | Done, tested |
| Portion layer (as-eaten serving from raw per-100 g values) | Done, tested |
| Spanish and English string tables; Spanish food names from the dataset (`names.es`) | Done, tested |
| Reference intakes, serving sizes, cooked-yield factors, scenario | Copied from version A with their citations (see below) |
| Deployment | Published at <https://anniececy.com/plato-andino/version-b/> |

`npm run build` fails if any data file is missing, fails its schema, or lacks
a source: the build is the gate for the spec's "do not invent values" rules.

### Data copied from version A

`data/game/reference-intakes.json`, `portions.json` and `scenarios.json` were
copied from version A (`main` at commit `f847454`, `src/data/`), values and
citations unchanged. Each file records this in its `provenance` field, and the
game's About screen shows it. Points to keep in mind:

- The values have not been checked independently against the cited sources.
- The reference profile is an adult woman aged 19 to 50 (60 kg reference,
  moderately active). Energy and protein are derived from that body weight and
  activity level, not single published figures.
- The meal share (lunch = one third of the daily intakes) is a design choice
  in version A with no external source.

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

```bash
npm run data:sync
```

`data:sync` downloads the dataset named in `data/andean-crops/PIN.json` and
compares its sha256 with the pin. It writes nothing when they differ, unless
run as `npm run data:sync -- --update-pin`. Behind an HTTP proxy, set
`NODE_USE_ENV_PROXY=1`.

## How the data flows

```
data/andean-crops/andean-crops.json         pinned dataset snapshot (copied, never fetched at run time)
data/andean-crops/consumer-contract.schema.json  the fields and units the game relies on
data/andean-crops/PIN.json                  name, version, source URL, sha256, retrieval date
data/game/reference-intakes.json            daily reference intakes, each with its citation
data/game/portions.json                     serving size and cooked-yield factor per food, each sourced
data/game/scenarios.json                    scenarios, each with a reference profile and a meal share
data/game/scoring.json                      scoring bands (game-design parameters)
data/game/schemas/                          JSON Schemas for the files above
        │
        ▼  build/game-data.ts (run by Vite at build time)
virtual:game-data                           validated bundle imported by the app
```

The snapshot is validated against `consumer-contract.schema.json`, written in
this repository. It is not the dataset's own schema: the dataset file refers to
`./andean-crops.schema.json`, but that file is not published next to it. Swap
in the upstream schema when it is available.

The build fails when:

- the snapshot does not match its schema, or its sha256 differs from `PIN.json`;
- a reference intake has no citation, or a portion factor has no source or is not flagged as an assumption;
- the dataset reports a scored nutrient in another unit than kcal, g, g, mg, mg;
- a crop has no Spanish name (`names.es`) in the dataset;
- tarwi, or any crop the dataset flags as not eaten raw, is given an uncooked portion;
- a crop carries a verification level the code does not know.

## Rules the code enforces

- **Playable or locked** (`src/domain/catalogue.ts`): a crop is playable when
  every scored value is `corroborated` or `verified` **and** it has a sourced
  portion. Otherwise it is a locked "coming soon" card: `unverified` values, no
  values, or values verified but portion awaiting a source. Locked cards carry
  no nutrient values. Tarwi is never given an uncooked portion (SPEC section 5),
  whether or not the dataset flags it.
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
scripts/      dataset sync
data/         dataset snapshot and game data files
tests/        Vitest tests and the synthetic fixture
```

## Licences

Code: MIT ([LICENSE](LICENSE)). Game content and text: CC BY 4.0
([LICENSE-CONTENT.md](LICENSE-CONTENT.md)).
