# Plato Andino — NutritionGame (Prototype)

A mobile-first educational plate-builder game that teaches adults to assemble a balanced meal from Andean ingredients, using verified food composition data and FAO/WHO adult reference intakes.

> **Disclaimer:** Prototype — for research and teaching, not dietary or medical advice. All nutrition content will be reviewed by a qualified nutritionist before public release.

## Current status (Milestone 1)

- **Pinned dataset:** `andean-crops` v0.3.0 (`2026-11-13`) copied into `src/data/andean-crops.json` and validated against `src/data/andean-crops.schema.json` on every build.
- **Data-driven availability:** The 9 playable crops (`quinoa`, `kiwicha`, `potato`, `lima-bean`, `common-bean`, `peanut`, `cherimoya`, `naranjilla`, `cape-gooseberry`) and 21 locked "coming soon" crops are derived automatically from the dataset's `corroborated`/`verified` fields.
- **As-eaten portion layer:** Converts raw per-100 g dataset values to typical cooked/prepared servings using sourced cooked-yield factors (`src/data/portions.json`), each explicitly flagged as an assumption.
- **Scoring & "no data" handling:** Scores energy, protein, dietary fibre, iron, and calcium against ⅓ of FAO/WHO daily reference intakes for an adult woman (19–50 y) stored with primary citations in `src/data/reference-intakes.json`. Missing nutrient values are displayed as "no data" and excluded from that nutrient's score — never treated as zero.
- **Bilingual (ES / EN):** All user-facing copy lives in `src/i18n/strings.ts`, with local Andean Spanish food names in `src/data/local-names.json`.
- **Offline-ready PWA & GitHub Pages:** Built with Vite + Preact + TypeScript + `vite-plugin-pwa`, with GitHub Actions deployment in `.github/workflows/deploy.yml`.

## Local development

```bash
npm install
npm run dev
```

## Validation, tests, and build

```bash
npm run validate:dataset   # Validate pinned dataset against JSON Schema + cross-refs
npm test                   # Run unit tests (scoring, no-data handling, playable/locked derivation)
npm run build              # Validate dataset, typecheck, and build production PWA bundle
```

## Licences

- **Code:** MIT
- **Game content and text:** CC BY 4.0
- **Crop photographs:** Wikimedia Commons images reused from `andean-crops`, each retaining its original licence and author credit (listed in the in-app **Sources & credits** dialog).

See [`SPEC.md`](./SPEC.md) for the full v1 design specification.
