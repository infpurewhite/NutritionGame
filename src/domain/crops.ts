import {
  SCORED_NUTRIENTS,
  type AndeanCropsDataset,
  type DatasetCrop,
  type DerivedCrop,
  type DerivedCropCatalog,
  type LocalNamesFile,
  type PortionRule,
  type ScoredNutrient,
  type VerificationLevel,
  type VerifiedNutrientMap,
} from './types';

const PLAYABLE_VERIFICATIONS = new Set<VerificationLevel>(['corroborated', 'verified']);

/**
 * Crops that contain toxic compounds when raw and must never be presented as edible raw.
 * Per SPEC.md §5: "Tarwi must never be presented as edible raw: the raw seed is toxic."
 */
const TOXIC_RAW_CROP_IDS = new Set<string>(['tarwi']);

export function isVerifiedForPlay(verification: VerificationLevel | undefined): boolean {
  return verification !== undefined && PLAYABLE_VERIFICATIONS.has(verification);
}

/**
 * Derives playable vs locked status from the dataset's verification fields.
 * Never hard-codes crop IDs for playability so crops unlock automatically when verified.
 *
 * When `portions` is given, a crop with verified values but no sourced portion stays
 * locked ('no_portion'): scoring uses the as-eaten portion, and SPEC.md §6 does not
 * allow unsourced portion factors.
 */
export function deriveCropAvailability(
  dataset: AndeanCropsDataset,
  localNames?: LocalNamesFile,
  portions?: Record<string, PortionRule>
): DerivedCropCatalog {
  const playable: DerivedCrop[] = [];
  const locked: DerivedCrop[] = [];
  const byId: Record<string, DerivedCrop> = {};

  for (const crop of dataset.crops) {
    const derived = deriveSingleCrop(crop, localNames, portions);
    byId[derived.id] = derived;
    if (derived.playable) {
      playable.push(derived);
    } else {
      locked.push(derived);
    }
  }

  return { playable, locked, byId };
}

function deriveSingleCrop(
  crop: DatasetCrop,
  localNames?: LocalNamesFile,
  portions?: Record<string, PortionRule>
): DerivedCrop {
  const values = crop.composition?.values ?? {};
  const rawValuesPer100g: VerifiedNutrientMap = {
    energy: null,
    protein: null,
    fibre: null,
    iron: null,
    calcium: null,
  };
  const missingNutrients: ScoredNutrient[] = [];

  let verifiedCount = 0;
  let unverifiedCount = 0;

  for (const nutrient of SCORED_NUTRIENTS) {
    const entry = values[nutrient];
    if (entry && typeof entry.value === 'number' && isVerifiedForPlay(entry.verification)) {
      rawValuesPer100g[nutrient] = entry.value;
      verifiedCount += 1;
    } else {
      rawValuesPer100g[nutrient] = null;
      missingNutrients.push(nutrient);
      if (entry && typeof entry.value === 'number') {
        unverifiedCount += 1;
      }
    }
  }

  const hasVerifiedValues = verifiedCount > 0;
  const hasPortion = portions === undefined || portions[crop.id] !== undefined;
  const playable = hasVerifiedValues && hasPortion;
  const lockReason: DerivedCrop['lockReason'] = playable
    ? null
    : hasVerifiedValues
      ? 'no_portion'
      : unverifiedCount > 0
        ? 'unverified'
        : 'no_data';

  const mappedNames = localNames?.crops[crop.id];
  const fallbackEs = crop.names.alternative?.[0] ?? crop.names.common;
  const names = {
    en: mappedNames?.en ?? crop.names.common,
    // SPEC.md §7: Spanish names belong in the dataset; the local file is only a fallback.
    es: crop.names.es ?? mappedNames?.es ?? fallbackEs,
  };

  return {
    id: crop.id,
    scientificName: `${crop.taxon.genus} ${crop.taxon.species}`,
    cropGroup: crop.crop_group,
    foodCondition: crop.food.condition,
    names,
    playable,
    lockReason,
    isProxy: crop.composition?.match === 'proxy',
    toxicRawWarning: TOXIC_RAW_CROP_IDS.has(crop.id),
    rawValuesPer100g,
    missingNutrients,
    sourceRecord: crop.composition?.source_record ?? null,
    image: crop.image ?? null,
  };
}
