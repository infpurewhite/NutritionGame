import {
  SCORED_NUTRIENTS,
  type DerivedCrop,
  type Locale,
  type NutrientEvaluation,
  type PlateEvaluation,
  type PlateItem,
  type PortionRule,
  type Scenario,
} from '../domain/types';
import { STRINGS, formatNumber, interpolate } from '../i18n/strings';

interface PlatePanelProps {
  locale: Locale;
  scenario: Scenario;
  plateItems: PlateItem[];
  evaluation: PlateEvaluation;
  cropsById: Record<string, DerivedCrop>;
  portionsById: Record<string, PortionRule>;
  onUpdateServings: (cropId: string, delta: number) => void;
  onClearPlate: () => void;
}

const RING_RADIUS = 33;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function getStatusLabel(
  status: NutrientEvaluation['status'],
  locale: Locale
): string {
  const s = STRINGS[locale];
  switch (status) {
    case 'balanced':
      return s.statusBalanced;
    case 'short':
      return s.statusShort;
    case 'over':
      return s.statusOver;
    case 'no_data':
      return s.statusNoData;
    case 'empty':
      return s.statusEmpty;
  }
}

export function PlatePanel({
  locale,
  scenario,
  plateItems,
  evaluation,
  cropsById,
  portionsById,
  onUpdateServings,
  onClearPlate,
}: PlatePanelProps) {
  const s = STRINGS[locale];
  const baseUrl = import.meta.env.BASE_URL;
  const score = evaluation.overallScore;
  const ringOffset =
    score === null
      ? RING_CIRCUMFERENCE
      : RING_CIRCUMFERENCE * (1 - Math.min(100, Math.max(0, score)) / 100);
  const ringClass =
    score === null ? '' : score >= 80 ? '' : score >= 55 ? 'is-mid' : 'is-low';

  return (
    <aside class="plate-column" aria-label={s.plateHeading}>
      {/* Scenario + overall balance score */}
      <section class="panel" aria-labelledby="scenario-heading">
        <div class="scenario-top">
          <div>
            <span class="scenario-kicker">{s.scenarioBadge}</span>
            <h2 id="scenario-heading" class="scenario-title">
              {scenario.title[locale]}
            </h2>
            <p class="scenario-subtitle">{scenario.subtitle[locale]}</p>
          </div>

          <div class="score-ring-wrap" aria-live="polite">
            <div class="score-ring">
              <svg viewBox="0 0 80 80" aria-hidden="true">
                <circle class="score-ring-track" cx="40" cy="40" r={RING_RADIUS} />
                <circle
                  class={`score-ring-fill ${ringClass}`}
                  cx="40"
                  cy="40"
                  r={RING_RADIUS}
                  stroke-dasharray={RING_CIRCUMFERENCE}
                  stroke-dashoffset={ringOffset}
                />
              </svg>
              <div class="score-ring-value">
                {score === null ? '—' : score}
              </div>
            </div>
            <span class="score-ring-label">{s.overallScoreLabel}</span>
          </div>
        </div>

        <p class="scenario-context">{scenario.context[locale]}</p>

        <div class="score-meta-note">
          <span>{s.mealTargetSummary}</span>
          {evaluation.isEmpty ? (
            <span>{s.scoreEmptyHint}</span>
          ) : (
            <span>
              {interpolate(s.scoreSubtext, { scored: evaluation.scoredNutrientCount })}
            </span>
          )}
          {evaluation.excludedNutrientCount > 0 && (
            <span>
              {interpolate(s.excludedNutrientsNote, {
                count: evaluation.excludedNutrientCount,
              })}
            </span>
          )}
        </div>
      </section>

      {/* Current plate items */}
      <section class="panel" aria-labelledby="plate-items-heading">
        <div class="section-header-row">
          <h2 id="plate-items-heading" class="section-heading">
            {s.plateHeading}
          </h2>
          {!evaluation.isEmpty && (
            <div class="plate-meta-right">
              <span>
                {interpolate(s.plateWeightLabel, {
                  grams: formatNumber(evaluation.totalCookedGrams, locale, 0),
                })}
              </span>
              <button
                type="button"
                id="clear-plate-btn"
                class="text-action-btn"
                onClick={onClearPlate}
              >
                {s.clearPlateButton}
              </button>
            </div>
          )}
        </div>

        {plateItems.length === 0 ? (
          <div class="plate-empty">
            <p class="plate-empty-title">{s.plateEmptyTitle}</p>
            <p class="plate-empty-body">{s.plateEmptyBody}</p>
          </div>
        ) : (
          <ul class="plate-items">
            {plateItems.map((item) => {
              const crop = cropsById[item.cropId];
              const portion = portionsById[item.cropId];
              if (!crop || !portion) return null;
              const name = crop.names[locale];
              const grams = Math.round(portion.servingGrams * item.servings);

              return (
                <li key={crop.id} class="plate-item-row">
                  <div class="plate-item-info">
                    {crop.image && (
                      <img
                        class="plate-item-thumb"
                        src={`${baseUrl}${crop.image.file}`}
                        alt=""
                        loading="lazy"
                      />
                    )}
                    <div>
                      <div class="plate-item-name">{name}</div>
                      <div class="plate-item-grams">
                        {formatNumber(grams, locale, 0)} g · {portion.preparedState[locale]}
                      </div>
                    </div>
                  </div>

                  <div class="stepper">
                    <button
                      type="button"
                      class="stepper-btn"
                      aria-label={interpolate(s.decreaseServingAria, { name })}
                      onClick={() => onUpdateServings(crop.id, -0.5)}
                    >
                      −
                    </button>
                    <span class="stepper-count">
                      {formatNumber(item.servings, locale, 1)}×
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
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Five scored nutrients */}
      <section class="panel" aria-labelledby="nutrients-heading">
        <div class="section-header-row">
          <h2 id="nutrients-heading" class="section-heading">
            {s.nutrientsHeading}
          </h2>
        </div>

        <div class="nutrient-list" aria-live="polite">
          {SCORED_NUTRIENTS.map((key) => {
            const ev = evaluation.nutrients[key];
            const decimals = key === 'energy' || key === 'calcium' ? 0 : 1;
            // Bar scale: 150% of meal target fills 100% of bar width; target marker sits at 66.66%
            const barWidthPct =
              ev.percentOfTarget === null
                ? 0
                : Math.min(100, Math.round((ev.percentOfTarget / 150) * 100));

            const missingNames = ev.missingDataCropIds
              .map((id) => cropsById[id]?.names[locale] ?? id)
              .join(', ');

            return (
              <div key={key} class="nutrient-row">
                <div class="nutrient-row-head">
                  <span class="nutrient-label">{s.nutrientNames[key]}</span>
                  <div class="nutrient-numbers">
                    <span class="nutrient-actual">
                      {ev.total === null
                        ? s.statusNoData
                        : `${formatNumber(ev.total, locale, decimals)} ${ev.unit}`}
                    </span>
                    <span>
                      /{' '}
                      {formatNumber(ev.target, locale, decimals)} {ev.unit}
                    </span>
                    <span class={`status-pill is-${ev.status}`}>
                      {getStatusLabel(ev.status, locale)}
                    </span>
                  </div>
                </div>

                <div class="meter-track" role="presentation">
                  <div
                    class={`meter-fill is-${ev.status}`}
                    style={{ width: `${barWidthPct}%` }}
                  />
                  <div class="meter-target-marker" />
                </div>

                {ev.status === 'no_data' && (
                  <p class="nutrient-footnote">{s.noDataNote}</p>
                )}
                {ev.hasPartialData && (
                  <p class="nutrient-footnote">
                    {interpolate(s.partialDataNote, { crops: missingNames })}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
