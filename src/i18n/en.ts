/** English string table. Keys are the contract; `es.ts` must define the same set. */
export const en = {
  'app.title': 'Andean Plate',
  'app.prototype': 'Prototype',
  'app.prototypeNotice':
    'Prototype: a nutritionist has not yet reviewed this content.',
  'app.disclaimer': 'For research and teaching, not dietary or medical advice.',
  'nav.play': 'Play',
  'nav.about': 'About and credits',
  'lang.label': 'Language',

  'scenario.heading': "Today's challenge",

  'foods.heading': 'Foods',
  'foods.portion': 'One portion: {grams} g, {state}',
  'foods.state.cooked': 'cooked',
  'foods.state.uncooked': 'uncooked',
  'foods.proxyNote': 'Proxy value: the source food is a close match, not this exact crop.',
  'foods.add': 'Add a portion of {food}',
  'foods.remove': 'Remove a portion of {food}',
  'foods.onPlate': '{count} on the plate',
  'foods.locked.heading': 'Coming soon',
  'foods.locked.unverified': 'Values awaiting verification',
  'foods.locked.no_values': 'No nutrient values yet',

  'plate.heading': 'Your plate',
  'plate.empty': 'Add portions to build your plate.',
  'plate.item': '{count} × {food}',
  'plate.clear': 'Clear the plate',

  'score.heading': 'Score',
  'score.overall': '{score} out of 100',
  'score.overallNone': 'No score yet',
  'score.amount': '{amount} of {target} {unit}',
  'score.amountNoData': 'no data (target {target} {unit})',
  'score.partial': 'Counts only foods with data. No data for: {foods}.',
  'score.excluded': 'No food on the plate has data for this nutrient, so it is left out of the score.',

  'nutrient.energy': 'Energy',
  'nutrient.protein': 'Protein',
  'nutrient.fibre': 'Fibre',
  'nutrient.iron': 'Iron',
  'nutrient.calcium': 'Calcium',

  'verdict.short': 'Short',
  'verdict.on_target': 'On target',
  'verdict.over': 'Over',
  'verdict.no_data': 'No data',

  'about.heading': 'About and credits',
  'about.dataset.heading': 'Food data',
  'about.dataset.body': '{name}, version {version}.',
  'about.dataset.basis':
    'Values are per 100 g edible portion in a raw state. The game converts them to portions as eaten.',
  'about.targets.heading': 'Nutrition targets',
  'about.targets.body':
    'Daily reference intakes for: {profile}. This meal is scored against {share}% of them.',
  'about.targets.perDay': '{amount} {unit} per day',
  'about.mealShare.source': 'Source for the meal share (an assumption):',
  'about.portions.heading': 'Portions',
  'about.portions.body':
    'Serving sizes and cooked-yield factors are assumptions. Each has a source. Nutrients are assumed to be fully retained on cooking.',
  'about.portions.row': '{food}: {grams} g {state}, yield factor {yield}',
  'about.portions.servingSource': 'Serving size:',
  'about.portions.yieldSource': 'Yield factor:',
  'about.licence.heading': 'Licences',
  'about.licence.body': 'Code: MIT. Game content and text: CC BY 4.0.',
} as const;

export type StringKey = keyof typeof en;
