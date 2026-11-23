import {
  calculatePortionNutrients,
  getRawEquivalentGrams,
} from '../domain/scoring';
import type { DerivedCrop, Locale, PortionRule } from '../domain/types';
import { STRINGS, formatNumber, interpolate } from '../i18n/strings';

interface FoodCardProps {
  locale: Locale;
  crop: DerivedCrop;
  portion: PortionRule;
  servingsOnPlate: number;
  onUpdateServings: (cropId: string, delta: number) => void;
}

export function FoodCard({
  locale,
  crop,
  portion,
  servingsOnPlate,
  onUpdateServings,
}: FoodCardProps) {
  const s = STRINGS[locale];
  const baseUrl = import.meta.env.BASE_URL;
  const name = crop.names[locale];
  const perServing = calculatePortionNutrients(crop, portion, 1);
  const rawGrams = getRawEquivalentGrams(portion, 1);

  return (
    <article
      class={`food-card ${servingsOnPlate > 0 ? 'is-selected' : ''}`}
      data-crop-id={crop.id}
    >
      <div class="food-card-media">
        {crop.image && (
          <img
            class="food-card-img"
            src={`${baseUrl}${crop.image.file}`}
            alt={name}
            width={crop.image.width}
            height={crop.image.height}
            loading="lazy"
          />
        )}
        <div class="food-card-badges">
          <span class="card-badge">
            {s.cropGroups[crop.cropGroup] ?? crop.cropGroup}
          </span>
          {crop.isProxy && (
            <span class="card-badge is-proxy" title={s.proxyExplanation}>
              {s.proxyBadge}
            </span>
          )}
          {servingsOnPlate > 0 && (
            <span class="card-badge is-on-plate">
              {formatNumber(servingsOnPlate, locale, 1)}×
            </span>
          )}
        </div>
      </div>

      <div class="food-card-body">
        <div>
          <h3 class="food-card-title">{name}</h3>
          <div class="food-card-sci">{crop.scientificName}</div>
        </div>

        <p class="food-card-serving">
          {interpolate(s.perServingLabel, {
            grams: formatNumber(portion.servingGrams, locale, 0),
            state: portion.preparedState[locale],
            measure: portion.householdMeasure[locale],
          })}
        </p>

        <div class="food-macro-pills">
          <span class={`macro-chip ${perServing.energy === null ? 'is-missing' : ''}`}>
            {perServing.energy === null
              ? `${s.nutrientNames.energy}: ${s.statusNoData}`
              : `${formatNumber(perServing.energy, locale, 0)} kcal`}
          </span>
          <span class={`macro-chip ${perServing.protein === null ? 'is-missing' : ''}`}>
            {perServing.protein === null
              ? `${s.nutrientNames.protein}: ${s.statusNoData}`
              : `${formatNumber(perServing.protein, locale, 1)} g ${s.nutrientNames.protein.toLowerCase()}`}
          </span>
          {crop.missingNutrients.length > 0 && (
            <span class="macro-chip is-missing">
              {s.missingValuesLabel}{' '}
              {crop.missingNutrients.map((n) => s.nutrientNames[n]).join(', ')}
            </span>
          )}
        </div>

        <details class="assumption-details">
          <summary>{s.portionInfoToggle}</summary>
          <p>
            {interpolate(s.rawBasisNote, {
              rawGrams: formatNumber(rawGrams, locale, 1),
              factor: formatNumber(portion.cookedYieldFactor, locale, 2),
            })}
          </p>
          <p>{portion.assumptionNote[locale]}</p>
          {crop.isProxy && <p>{s.proxyExplanation}</p>}
        </details>
      </div>

      <div class="food-card-footer">
        {servingsOnPlate === 0 ? (
          <button
            type="button"
            id={`add-${crop.id}`}
            class="primary-add-btn"
            onClick={() => onUpdateServings(crop.id, 1)}
          >
            + {s.addToPlateButton}
          </button>
        ) : (
          <div class="food-card-stepper-row">
            <button
              type="button"
              class="stepper-btn"
              aria-label={interpolate(s.decreaseServingAria, { name })}
              onClick={() => onUpdateServings(crop.id, -0.5)}
            >
              −
            </button>
            <span class="stepper-count">
              {formatNumber(servingsOnPlate, locale, 1)}{' '}
              {servingsOnPlate === 1 ? s.servingsUnitSingular : s.servingsUnitPlural}
            </span>
            <button
              type="button"
              class="stepper-btn"
              aria-label={interpolate(s.increaseServingAria, { name })}
              onClick={() => onUpdateServings(crop.id, 0.5)}
            >
              +
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
