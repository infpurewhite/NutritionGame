import type { PlateScore } from '../domain/scoring.ts';
import { NUTRIENT_IDS, NUTRIENT_UNITS } from '../domain/types.ts';
import type { Locale, NutrientId } from '../domain/types.ts';
import type { Translate } from './App.tsx';

interface Props {
  t: Translate;
  locale: Locale;
  score: PlateScore;
  foodName: (foodId: string) => string;
}

/** Decimal places shown per nutrient. */
const DIGITS: Readonly<Record<NutrientId, number>> = {
  energy: 0,
  protein: 1,
  fibre: 1,
  iron: 1,
  calcium: 0,
};

export function formatAmount(locale: Locale, nutrient: NutrientId, value: number): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: DIGITS[nutrient] }).format(value);
}

export function ScorePanel({ t, locale, score, foodName }: Props) {
  return (
    <section class="card" aria-labelledby="score-heading">
      <h2 id="score-heading">{t('score.heading')}</h2>
      <p class="overall" aria-live="polite">
        {score.overall === null
          ? t('score.overallNone')
          : t('score.overall', { score: score.overall })}
      </p>
      <ul class="nutrients">
        {NUTRIENT_IDS.map((id) => {
          const result = score.nutrients[id];
          const unit = NUTRIENT_UNITS[id];
          const target = formatAmount(locale, id, result.target.target);
          const fill =
            result.total === null || result.target.target <= 0
              ? 0
              : Math.min(1, result.total / result.target.target);
          return (
            <li key={id} class={`nutrient ${result.verdict}`}>
              <div class="row">
                <span class="name">{t(`nutrient.${id}`)}</span>
                <span class="verdict">{t(`verdict.${result.verdict}`)}</span>
              </div>
              <div class="bar" aria-hidden="true">
                <span style={{ width: `${Math.round(fill * 100)}%` }} />
              </div>
              <p class="muted">
                {result.total === null
                  ? t('score.amountNoData', { target, unit })
                  : t('score.amount', {
                      amount: formatAmount(locale, id, result.total),
                      target,
                      unit,
                    })}
              </p>
              {result.total === null && <p class="note">{t('score.excluded')}</p>}
              {result.total !== null && result.isPartial && (
                <p class="note">
                  {t('score.partial', {
                    foods: result.missingFoodIds.map(foodName).join(', '),
                  })}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
