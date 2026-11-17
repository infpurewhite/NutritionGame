/**
 * Shared domain types. Pure data shapes only: no I/O, no framework imports.
 */

/** The five scored nutrients (SPEC section 4). */
export const NUTRIENT_IDS = ['energy', 'protein', 'fibre', 'iron', 'calcium'] as const;
export type NutrientId = (typeof NUTRIENT_IDS)[number];

export type NutrientUnit = 'kcal' | 'g' | 'mg';

/** Units used throughout the game. The build adapter converts dataset units to these. */
export const NUTRIENT_UNITS: Readonly<Record<NutrientId, NutrientUnit>> = {
  energy: 'kcal',
  protein: 'g',
  fibre: 'g',
  iron: 'mg',
  calcium: 'mg',
};

/** `null` means "no data". It is never coerced to zero. */
export type NutrientValues = Readonly<Record<NutrientId, number | null>>;

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export type LocalisedText = Readonly<Record<Locale, string>>;

/** A citation for a stored value. `locator` is the table, page or clause. */
export interface SourceRef {
  readonly citation: string;
  readonly url?: string;
  readonly locator?: string;
}

/** One dataset crop after normalisation by the build adapter. */
export interface CropRecord {
  readonly id: string;
  readonly nameEn: string;
  /** Per 100 g edible portion, raw state, in game units. */
  readonly per100gRaw: NutrientValues;
  /**
   * Distinct verification levels attached to the crop's scored values,
   * exactly as written in the dataset. Empty when the crop has no values.
   */
  readonly verificationLevels: readonly string[];
  /** True when the dataset marks the values as a proxy match. */
  readonly isProxy: boolean;
  /** True when the dataset flags the raw food as not eaten (tarwi: toxic raw seed). */
  readonly notEatenRaw: boolean;
}

/** How a food is eaten. SPEC section 6: every factor is a sourced assumption. */
export interface PortionSpec {
  /** Typical serving weight as eaten, in grams. */
  readonly servingGramsAsEaten: number;
  /** As-eaten weight divided by raw weight. 1 for foods eaten uncooked. */
  readonly cookedYieldFactor: number;
  readonly state: 'cooked' | 'uncooked';
  readonly servingSource: SourceRef;
  readonly yieldSource: SourceRef;
  readonly assumption: true;
}

export type LockReason = 'unverified' | 'no_values';

export interface PlayableFood {
  readonly id: string;
  readonly status: 'playable';
  readonly names: LocalisedText;
  readonly isProxy: boolean;
  readonly portion: PortionSpec;
  /** Nutrients in one as-eaten serving. */
  readonly perServing: NutrientValues;
}

/** Locked cards carry no nutrient values, so unverified values never reach the client. */
export interface LockedFood {
  readonly id: string;
  readonly status: 'locked';
  readonly names: LocalisedText;
  readonly lockReason: LockReason;
}

export type Food = PlayableFood | LockedFood;

export interface ReferenceIntake {
  readonly amountPerDay: number;
  readonly unit: NutrientUnit;
  readonly source: SourceRef;
  readonly note?: string;
}

/** A set of daily reference intakes for one reference adult. */
export interface ReferenceProfile {
  readonly id: string;
  readonly description: LocalisedText;
  readonly intakes: Readonly<Record<NutrientId, ReferenceIntake>>;
}

export interface Scenario {
  readonly id: string;
  readonly title: LocalisedText;
  readonly description: LocalisedText;
  readonly referenceProfileId: string;
  /** Share of the daily reference intake this meal should supply (0 to 1). */
  readonly mealShare: {
    readonly value: number;
    readonly source: SourceRef;
    readonly assumption: true;
  };
}

/** How one nutrient's meal target is judged. */
export type TargetBand =
  | { readonly kind: 'at_least' }
  /** On target within +/- `tolerance` (a fraction) of the meal target. */
  | { readonly kind: 'range'; readonly tolerance: number };

/** Game-design parameters, not nutrition reference values. */
export interface ScoringConfig {
  readonly bands: Readonly<Record<NutrientId, TargetBand>>;
  readonly note: string;
}

export interface DatasetInfo {
  readonly name: string;
  readonly version: string;
  readonly sourceUrl: string;
  readonly sha256: string;
}

/** Everything the app needs, assembled and validated at build time. */
export interface GameData {
  readonly dataset: DatasetInfo;
  readonly foods: readonly Food[];
  readonly scenarios: readonly Scenario[];
  readonly referenceProfiles: readonly ReferenceProfile[];
  readonly scoring: ScoringConfig;
}
