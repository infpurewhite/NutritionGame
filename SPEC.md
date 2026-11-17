# NutritionGame: design spec (v1)

Status: agreed 17 Nov 2026. This file is the source of truth for the first build.
Anything not covered here is undecided: ask before assuming.

## 1. Purpose

A game that teaches adults to build a balanced plate from Andean ingredients.

- **Frame**: ancestral food heritage plus general nutrition science.
- **Not claimed**: that these foods benefit people of Andean ancestry more than anyone else. No disease-treatment or medical claims anywhere in the game.
- **Success**: a player can assemble a balanced plate from Andean foods. The project is mission-led; there is no monetisation in v1 (no ads, purchases or donations). Measure retention first.

## 2. Player

- Adults in Peru, Bolivia and Ecuador, and the Andean diaspora.
- Spanish and English from day one. All user-facing text goes through a string table; no hard-coded copy.
- Use local food names in Spanish (olluco, aguaymanto, maíz morado), not translations of the English names.

## 3. Core loop

Plate-builder with short daily challenges.

1. The player gets a scenario (a meal for a person or occasion).
2. They combine food portions onto a plate.
3. The plate is scored against nutrition targets, with feedback on what is short or over.

Out of scope for v1: farming or market simulation, narrative mode, accounts, leaderboards.

## 4. Scoring

- Scored nutrients: energy, protein, fibre, iron, calcium.
- Targets: FAO/WHO adult reference intakes. Store the reference values with their source citation in a data file; do not invent or estimate them. If a value cannot be sourced, stop and ask.
- A missing nutrient value is shown as "no data" and excluded from that nutrient's score. It is never treated as zero.

## 5. Foods

Data comes from the andean-crops dataset (section 7). Each crop has a verification level there.

- **Playable (scored)**: crops whose values are `corroborated` or `verified`. In dataset v0.3.0 these are quinoa, kiwicha, potato, lima bean, common bean, peanut, cherimoya, naranjilla and cape gooseberry (aguaymanto).
- **Locked "coming soon" cards**: crops with `unverified` values (cañihua, tarwi, maca, purple corn, mashua, oca) and crops with no values yet (chuño, olluco and others).
- The playable/locked split must be derived from the dataset's verification fields at build time, not hard-coded, so a crop unlocks when the dataset verifies it.
- Proxy matches (kiwicha, cape gooseberry) are playable but show a "proxy value" note.
- Tarwi must never be presented as edible raw: the raw seed is toxic.

## 6. Portions

Dataset values are per 100 g edible portion in a raw state (dry seed, fresh tuber or fruit). These are not comparable across states and are not what people eat.

- Add a portion layer in the game: typical serving size and cooked-yield factor per food.
- Every factor is stored with its source and flagged as an assumption. Unsourced factors are not allowed: stop and ask.
- Scoring uses the as-eaten portion, not raw 100 g.

## 7. Data

- Source: `https://github.com/infpurewhite/andean-crops` (published at `https://anniececy.com/andean-crops/data/andean-crops.json`).
- Copy a pinned dataset version into this repo at build time. Do not fetch at run time.
- Show the dataset version in the game (about or credits screen).
- Validate the copied file against its schema in the build; fail the build on mismatch.
- Spanish and local names belong in the dataset as fields, shared by both projects. Until they exist there, keep them in one clearly marked file in this repo.

## 8. Genetics content

One unscored "Did you know?" card attached to the potato:

- Content: evidence that Andean populations adapted genetically to a starch-rich diet (MGAM, AMY1).
- Sources to cite on the card:
  - Lindo et al. (2018), *Science Advances*: positive selection on MGAM in ancient Andean genomes.
  - Jorgensen et al. (2023), *American Journal of Biological Anthropology*, DOI 10.1002/ajpa.24656: Peruvian-specific MGAM haplotype.
  - 2026 *Nature Communications* paper on high AMY1 copy number in Indigenous Peruvian Andean populations (verify the full citation before release).
- Wording describes population history. It makes no claim about any individual player's health or diet.

## 9. Platform and stack

- Mobile-first web app (installable PWA), hosted on GitHub Pages.
- TypeScript with a light framework. No backend; progress is saved on the device, with a graceful fallback if storage is unavailable.
- Works offline after first load.
- Replace the Google AI Studio placeholder README.

## 10. Content, licences and review

- Code: MIT. Game content and text: CC BY 4.0.
- Photos: reuse the Wikimedia Commons images from the andean-crops site. Each keeps its original licence and author credit, shown in a credits screen.
- Carry over the disclaimer: "For research and teaching, not dietary or medical advice."
- A nutritionist reviews all content before public release. Until then the game is labelled as a prototype.

## 11. Budget

Solo build, 3 to 4 hours a week. First playable version in 6 to 8 weeks.

## 12. First milestone

A playable vertical slice:

1. Dataset snapshot copied, validated and loaded.
2. One scenario, the playable foods, a plate, and a score on the five nutrients.
3. Spanish and English strings.
4. Deployed to GitHub Pages.

Tests cover the scoring logic, the "no data" handling and the playable/locked derivation.
