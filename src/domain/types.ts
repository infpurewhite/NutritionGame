export type Locale = 'es' | 'en';

export type ScoredNutrient = 'energy' | 'protein' | 'fibre' | 'iron' | 'calcium';

export const SCORED_NUTRIENTS: readonly ScoredNutrient[] = [
  'energy',
  'protein',
  'fibre',
  'iron',
  'calcium',
] as const;

export type VerificationLevel = 'verified' | 'corroborated' | 'unverified';

export interface LocalizedText {
  en: string;
  es: string;
}

export interface DatasetComponent {
  id: string;
  label: string;
  unit: string;
  infoods?: string;
  group: string;
  decimals: number;
  description: string;
}

export interface DatasetNutrientValue {
  value: number;
  verification: VerificationLevel;
  note?: string;
}

export interface DatasetCropImage {
  file: string;
  alt: string;
  width: number;
  height: number;
  credit: {
    title: string;
    author: string;
    licence: string;
    source_url: string;
    licence_url: string;
  };
}

export interface DatasetCrop {
  id: string;
  names: {
    common: string;
    alternative?: string[];
  };
  taxon: {
    genus: string;
    species: string;
    authority?: string;
    family: string;
  };
  crop_group: string;
  edible_part: string;
  food: {
    description: string;
    condition: string;
  };
  composition?: {
    source?: string | null;
    source_record?: string | null;
    match: 'direct' | 'proxy' | 'unknown';
    values: Record<string, DatasetNutrientValue>;
  } | null;
  notes?: Array<{
    kind: string;
    text: string;
    refs?: string[];
    checked?: boolean;
  }>;
  flags?: string[];
  image?: DatasetCropImage;
}

export interface DatasetSource {
  id: string;
  citation?: string;
  title?: string;
  url?: string;
  [key: string]: unknown;
}

export interface AndeanCropsDataset {
  $schema?: string;
  metadata: {
    title: string;
    version: string;
    date: string;
    description: string;
    basis: string;
    verification_levels: Record<VerificationLevel, string>;
  };
  components: DatasetComponent[];
  sources: DatasetSource[];
  crops: DatasetCrop[];
}

export interface LocalNamesFile {
  crops: Record<string, LocalizedText>;
}

export interface PortionRule {
  servingGrams: number;
  cookedYieldFactor: number;
  preparedState: LocalizedText;
  householdMeasure: LocalizedText;
  servingSource: string;
  yieldSource: string;
  isAssumption: boolean;
  assumptionNote: LocalizedText;
}

export interface PortionsFile {
  _methodology: string;
  portions: Record<string, PortionRule>;
}

export interface ReferenceNutrientTarget {
  dailyTarget: number;
  unit: string;
  source: string;
  url: string;
}

export interface ReferenceIntakesFile {
  profileId: string;
  profileLabel: LocalizedText;
  nutrients: Record<ScoredNutrient, ReferenceNutrientTarget>;
}

export interface Scenario {
  id: string;
  mealFraction: number;
  referenceProfileId: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  context: LocalizedText;
}

/**
 * Per-100 g raw verified/corroborated nutrient values.
 * Null means the dataset has no verified/corroborated value ("no data"), never zero.
 */
export type VerifiedNutrientMap = Record<ScoredNutrient, number | null>;

export interface DerivedCrop {
  id: string;
  scientificName: string;
  cropGroup: string;
  foodCondition: string;
  names: LocalizedText;
  playable: boolean;
  lockReason: 'unverified' | 'no_data' | null;
  isProxy: boolean;
  toxicRawWarning: boolean;
  rawValuesPer100g: VerifiedNutrientMap;
  missingNutrients: ScoredNutrient[];
  sourceRecord: string | null;
  image: DatasetCropImage | null;
}

export interface DerivedCropCatalog {
  playable: DerivedCrop[];
  locked: DerivedCrop[];
  byId: Record<string, DerivedCrop>;
}

export interface PlateItem {
  cropId: string;
  servings: number;
}

export type NutrientStatus = 'empty' | 'no_data' | 'short' | 'balanced' | 'over';

export interface NutrientEvaluation {
  nutrient: ScoredNutrient;
  unit: string;
  target: number;
  dailyTarget: number;
  /** Null when no item on the plate has verified data for this nutrient. */
  total: number | null;
  /** Percentage of meal target (0..∞), or null when total is null. */
  percentOfTarget: number | null;
  /** 0..100 score, or null when excluded because of "no_data". */
  score: number | null;
  status: NutrientStatus;
  /** Crop IDs on the plate that had no verified data for this nutrient. */
  missingDataCropIds: string[];
  /** True when at least one item on the plate had data AND at least one lacked data. */
  hasPartialData: boolean;
}

export interface PlateEvaluation {
  isEmpty: boolean;
  totalCookedGrams: number;
  /** Average score across nutrients with data, or null if empty / all no_data. */
  overallScore: number | null;
  scoredNutrientCount: number;
  excludedNutrientCount: number;
  nutrients: Record<ScoredNutrient, NutrientEvaluation>;
}
