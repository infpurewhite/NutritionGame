import type { Locale, ScoredNutrient } from '../domain/types';

export interface StringTable {
  appName: string;
  appTagline: string;
  prototypeBadge: string;
  languageToggleLabel: string;
  aboutButton: string;
  closeButton: string;

  // Scenario & Score
  scenarioBadge: string;
  overallScoreLabel: string;
  scoreEmptyHint: string;
  scoreSubtext: string;
  excludedNutrientsNote: string;
  mealTargetSummary: string;

  // Plate
  plateHeading: string;
  plateEmptyTitle: string;
  plateEmptyBody: string;
  clearPlateButton: string;
  plateWeightLabel: string;
  servingsUnitSingular: string;
  servingsUnitPlural: string;
  removeItemAria: string;
  decreaseServingAria: string;
  increaseServingAria: string;

  // Nutrients
  nutrientsHeading: string;
  nutrientNames: Record<ScoredNutrient, string>;
  statusEmpty: string;
  statusNoData: string;
  statusShort: string;
  statusBalanced: string;
  statusOver: string;
  targetLabel: string;
  noDataNote: string;
  partialDataNote: string;

  // Foods
  playableFoodsHeading: string;
  playableFoodsSubtitle: string;
  addToPlateButton: string;
  onPlateBadge: string;
  proxyBadge: string;
  proxyExplanation: string;
  portionInfoToggle: string;
  portionAssumptionLabel: string;
  missingValuesLabel: string;
  perServingLabel: string;
  rawBasisNote: string;

  // Locked crops
  lockedHeading: string;
  lockedSubtitle: string;
  comingSoonBadge: string;
  lockReasonUnverified: string;
  lockReasonNoData: string;
  tarwiSafetyWarning: string;
  showLockedToggle: string;
  hideLockedToggle: string;

  // Crop groups
  cropGroups: Record<string, string>;

  // About / Credits / Disclaimer
  disclaimerBanner: string;
  prototypeReviewNote: string;
  aboutTitle: string;
  aboutDatasetHeading: string;
  aboutDatasetVersion: string;
  aboutDatasetDate: string;
  aboutDatasetLinkLabel: string;
  aboutTargetsHeading: string;
  aboutPortionsHeading: string;
  aboutCreditsHeading: string;
  aboutLicencesHeading: string;
  aboutLicencesBody: string;
  aboutSourceLabel: string;
  aboutYieldLabel: string;
  aboutServingLabel: string;
  aboutPhotoBy: string;
  aboutLicenceLabel: string;
}

export const STRINGS: Record<Locale, StringTable> = {
  es: {
    appName: 'Plato Andino',
    appTagline: 'Arma un plato equilibrado con ingredientes andinos',
    prototypeBadge: 'Prototipo',
    languageToggleLabel: 'Cambiar idioma a inglés',
    aboutButton: 'Fuentes y créditos',
    closeButton: 'Cerrar',

    scenarioBadge: 'Desafío del día',
    overallScoreLabel: 'Equilibrio del plato',
    scoreEmptyHint: 'Agrega porciones para ver tu puntaje',
    scoreSubtext: 'Basado en {scored} de 5 nutrientes con datos verificados',
    excludedNutrientsNote: '{count} nutriente(s) sin datos excluido(s) del puntaje',
    mealTargetSummary: 'Meta del almuerzo: ⅓ de la ingesta diaria FAO/OMS',

    plateHeading: 'Tu plato',
    plateEmptyTitle: 'El plato está vacío',
    plateEmptyBody: 'Elige alimentos andinos abajo para armar tu almuerzo.',
    clearPlateButton: 'Limpiar plato',
    plateWeightLabel: '{grams} g servidos',
    servingsUnitSingular: 'porción',
    servingsUnitPlural: 'porciones',
    removeItemAria: 'Quitar {name} del plato',
    decreaseServingAria: 'Reducir porción de {name}',
    increaseServingAria: 'Aumentar porción de {name}',

    nutrientsHeading: 'Balance nutricional',
    nutrientNames: {
      energy: 'Energía',
      protein: 'Proteína',
      fibre: 'Fibra dietética',
      iron: 'Hierro',
      calcium: 'Calcio',
    },
    statusEmpty: 'Sin alimentos',
    statusNoData: 'Sin datos',
    statusShort: 'Bajo',
    statusBalanced: 'Equilibrado',
    statusOver: 'Alto',
    targetLabel: 'Meta: {target} {unit}',
    noDataNote: 'Sin datos verificados para los alimentos elegidos (no se cuenta como cero).',
    partialDataNote: 'Datos parciales: sin valor verificado en {crops} (no se cuenta como cero).',

    playableFoodsHeading: 'Alimentos andinos disponibles',
    playableFoodsSubtitle:
      'Solo se incluyen cultivos con valores corroborados o verificados en el conjunto de datos.',
    addToPlateButton: 'Agregar',
    onPlateBadge: 'En el plato',
    proxyBadge: 'Valor sustituto',
    proxyExplanation:
      'Registro proxy en el conjunto de datos (especie o variedad cercana utilizada como referencia).',
    portionInfoToggle: 'Ver supuestos de porción',
    portionAssumptionLabel: 'Supuesto de porción y rendimiento',
    missingValuesLabel: 'Sin datos:',
    perServingLabel: '{grams} g {state} · {measure}',
    rawBasisNote: 'Equivalente crudo: {rawGrams} g (rendimiento {factor}×)',

    lockedHeading: 'Próximamente',
    lockedSubtitle:
      'Cultivos bloqueados automáticamente hasta que sus valores sean verificados en el conjunto de datos.',
    comingSoonBadge: 'Próximamente',
    lockReasonUnverified: 'Valores sin verificar',
    lockReasonNoData: 'Sin datos aún',
    tarwiSafetyWarning: 'Semilla cruda tóxica: requiere desamargado antes de consumir.',
    showLockedToggle: 'Mostrar {count} cultivos en espera',
    hideLockedToggle: 'Ocultar cultivos en espera',

    cropGroups: {
      pseudocereal: 'Pseudocereal',
      cereal: 'Cereal',
      tuber: 'Tubérculo',
      root: 'Raíz',
      legume: 'Legumbre',
      fruit: 'Fruta',
      'capsicum-spice': 'Ají / condimento',
    },

    disclaimerBanner:
      'Prototipo solo para investigación y enseñanza; no constituye consejo dietético ni médico.',
    prototypeReviewNote:
      'Todo el contenido será revisado por un profesional en nutrición antes de su publicación pública.',
    aboutTitle: 'Fuentes, supuestos y créditos',
    aboutDatasetHeading: 'Conjunto de datos de cultivos andinos',
    aboutDatasetVersion: 'Versión fijada: v{version}',
    aboutDatasetDate: 'Fecha del registro: {date}',
    aboutDatasetLinkLabel: 'Ver proyecto andean-crops en GitHub',
    aboutTargetsHeading: 'Ingestas diarias de referencia (FAO/OMS)',
    aboutPortionsHeading: 'Porciones y factores de rendimiento (supuestos)',
    aboutCreditsHeading: 'Créditos fotográficos (Wikimedia Commons)',
    aboutLicencesHeading: 'Licencias',
    aboutLicencesBody:
      'Código bajo licencia MIT. Contenido y textos del juego bajo CC BY 4.0. Cada fotografía mantiene su licencia original de Wikimedia Commons.',
    aboutSourceLabel: 'Fuente:',
    aboutYieldLabel: 'Rendimiento de cocción:',
    aboutServingLabel: 'Porción típica:',
    aboutPhotoBy: 'Autor:',
    aboutLicenceLabel: 'Licencia:',
  },

  en: {
    appName: 'Plato Andino',
    appTagline: 'Build a balanced plate from Andean ingredients',
    prototypeBadge: 'Prototype',
    languageToggleLabel: 'Switch language to Spanish',
    aboutButton: 'Sources & credits',
    closeButton: 'Close',

    scenarioBadge: 'Daily challenge',
    overallScoreLabel: 'Plate balance',
    scoreEmptyHint: 'Add portions to see your score',
    scoreSubtext: 'Scored across {scored} of 5 nutrients with verified data',
    excludedNutrientsNote: '{count} nutrient(s) with no data excluded from score',
    mealTargetSummary: 'Lunch target: ⅓ of FAO/WHO daily reference intake',

    plateHeading: 'Your plate',
    plateEmptyTitle: 'Your plate is empty',
    plateEmptyBody: 'Choose Andean foods below to assemble your lunch.',
    clearPlateButton: 'Clear plate',
    plateWeightLabel: '{grams} g served',
    servingsUnitSingular: 'serving',
    servingsUnitPlural: 'servings',
    removeItemAria: 'Remove {name} from plate',
    decreaseServingAria: 'Decrease serving of {name}',
    increaseServingAria: 'Increase serving of {name}',

    nutrientsHeading: 'Nutrition balance',
    nutrientNames: {
      energy: 'Energy',
      protein: 'Protein',
      fibre: 'Dietary fibre',
      iron: 'Iron',
      calcium: 'Calcium',
    },
    statusEmpty: 'No food yet',
    statusNoData: 'No data',
    statusShort: 'Short',
    statusBalanced: 'Balanced',
    statusOver: 'Over',
    targetLabel: 'Target: {target} {unit}',
    noDataNote: 'No verified data for the selected foods (never treated as zero).',
    partialDataNote: 'Partial data: missing verified value for {crops} (never treated as zero).',

    playableFoodsHeading: 'Playable Andean foods',
    playableFoodsSubtitle:
      'Derived automatically from crops with corroborated or verified values in the dataset.',
    addToPlateButton: 'Add',
    onPlateBadge: 'On plate',
    proxyBadge: 'Proxy value',
    proxyExplanation:
      'Proxy match in the dataset (closely related species or generic record used as reference).',
    portionInfoToggle: 'Portion assumptions',
    portionAssumptionLabel: 'Portion & yield assumption',
    missingValuesLabel: 'No data:',
    perServingLabel: '{grams} g {state} · {measure}',
    rawBasisNote: 'Raw equivalent: {rawGrams} g ({factor}× yield)',

    lockedHeading: 'Coming soon',
    lockedSubtitle:
      'Automatically locked until their nutrient values are verified in the dataset.',
    comingSoonBadge: 'Coming soon',
    lockReasonUnverified: 'Unverified values',
    lockReasonNoData: 'Awaiting data',
    tarwiSafetyWarning: 'Raw seed is toxic — must be debittered and cooked before eating.',
    showLockedToggle: 'Show {count} locked crops',
    hideLockedToggle: 'Hide locked crops',

    cropGroups: {
      pseudocereal: 'Pseudocereal',
      cereal: 'Cereal',
      tuber: 'Tuber',
      root: 'Root',
      legume: 'Legume',
      fruit: 'Fruit',
      'capsicum-spice': 'Chilli / spice',
    },

    disclaimerBanner: 'Prototype — for research and teaching, not dietary or medical advice.',
    prototypeReviewNote:
      'All nutrition content will be reviewed by a qualified nutritionist before public release.',
    aboutTitle: 'Sources, assumptions & credits',
    aboutDatasetHeading: 'Andean crops dataset',
    aboutDatasetVersion: 'Pinned version: v{version}',
    aboutDatasetDate: 'Snapshot date: {date}',
    aboutDatasetLinkLabel: 'View andean-crops on GitHub',
    aboutTargetsHeading: 'Daily reference intakes (FAO/WHO)',
    aboutPortionsHeading: 'Portions & cooked-yield factors (assumptions)',
    aboutCreditsHeading: 'Photo credits (Wikimedia Commons)',
    aboutLicencesHeading: 'Licences',
    aboutLicencesBody:
      'Code is MIT-licensed. Game content and text are CC BY 4.0. Each photograph retains its original Wikimedia Commons licence.',
    aboutSourceLabel: 'Source:',
    aboutYieldLabel: 'Cooked yield:',
    aboutServingLabel: 'Typical serving:',
    aboutPhotoBy: 'Author:',
    aboutLicenceLabel: 'Licence:',
  },
};

export function interpolate(
  template: string,
  params: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`
  );
}

export function formatNumber(value: number, locale: Locale, decimals = 1): string {
  return new Intl.NumberFormat(locale === 'es' ? 'es-PE' : 'en-GB', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals === 0 ? 0 : 0,
  }).format(value);
}
