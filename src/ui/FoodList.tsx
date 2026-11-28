import type { Food, Locale, LockedFood, PlayableFood } from '../domain/types.ts';
import type { Translate } from './App.tsx';

interface Props {
  t: Translate;
  locale: Locale;
  foods: readonly Food[];
  plate: Readonly<Record<string, number>>;
  onChange: (foodId: string, delta: number) => void;
}

export function FoodList({ t, locale, foods, plate, onChange }: Props) {
  const grams = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const playable = foods.filter((food): food is PlayableFood => food.status === 'playable');
  const locked = foods.filter((food): food is LockedFood => food.status === 'locked');

  return (
    <div class="foods">
      <section aria-labelledby="foods-heading">
        <h2 id="foods-heading">{t('foods.heading')}</h2>
        <ul class="grid">
          {playable.map((food) => {
            const count = plate[food.id] ?? 0;
            const name = food.names[locale];
            return (
              <li key={food.id} class="card food">
                <h3>{name}</h3>
                <p class="muted">
                  {t('foods.portion', {
                    grams: grams.format(food.portion.servingGramsAsEaten),
                    state:
                      food.portion.preparedState?.[locale] ?? t(`foods.state.${food.portion.state}`),
                  })}
                </p>
                {food.portion.householdMeasure && (
                  <p class="muted">{food.portion.householdMeasure[locale]}</p>
                )}
                {food.isProxy && <p class="tag">{t('foods.proxyNote')}</p>}
                <div class="stepper">
                  <button
                    type="button"
                    aria-label={t('foods.remove', { food: name })}
                    disabled={count === 0}
                    onClick={() => onChange(food.id, -1)}
                  >
                    −
                  </button>
                  <span aria-live="polite" aria-label={t('foods.onPlate', { count })}>
                    {count}
                  </span>
                  <button
                    type="button"
                    aria-label={t('foods.add', { food: name })}
                    onClick={() => onChange(food.id, 1)}
                  >
                    +
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {locked.length > 0 && (
        <section aria-labelledby="locked-heading">
          <h2 id="locked-heading">{t('foods.locked.heading')}</h2>
          <ul class="grid">
            {locked.map((food) => (
              <li key={food.id} class="card food locked">
                <h3>{food.names[locale]}</h3>
                <p class="muted">{t(`foods.locked.${food.lockReason}`)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
