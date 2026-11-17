import { NUTRIENT_IDS } from '../domain/types.ts';
import type {
  GameData,
  Locale,
  PlayableFood,
  ReferenceProfile,
  Scenario,
  SourceRef,
} from '../domain/types.ts';
import type { Translate } from './App.tsx';
import { formatAmount } from './ScorePanel.tsx';

interface Props {
  t: Translate;
  locale: Locale;
  data: GameData;
  scenario: Scenario;
  profile: ReferenceProfile;
}

function Source({ source }: { source: SourceRef }) {
  const text = source.locator ? `${source.citation} (${source.locator})` : source.citation;
  return source.url ? (
    <a href={source.url} rel="noreferrer">
      {text}
    </a>
  ) : (
    <span>{text}</span>
  );
}

export function About({ t, locale, data, scenario, profile }: Props) {
  const playable = data.foods.filter((food): food is PlayableFood => food.status === 'playable');
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

  return (
    <main class="about">
      <h2>{t('about.heading')}</h2>
      <p>{t('app.prototypeNotice')}</p>
      <p>{t('app.disclaimer')}</p>

      <section class="card">
        <h3>{t('about.dataset.heading')}</h3>
        <p>
          <a href={data.dataset.sourceUrl} rel="noreferrer">
            {t('about.dataset.body', {
              name: data.dataset.name,
              version: data.dataset.version,
            })}
          </a>
        </p>
        <p class="muted">{t('about.dataset.basis')}</p>
      </section>

      <section class="card">
        <h3>{t('about.targets.heading')}</h3>
        <p>
          {t('about.targets.body', {
            profile: profile.description[locale],
            share: number.format(scenario.mealShare.value * 100),
          })}
        </p>
        <ul class="sources">
          {NUTRIENT_IDS.map((id) => {
            const intake = profile.intakes[id];
            return (
              <li key={id}>
                <strong>{t(`nutrient.${id}`)}</strong>:{' '}
                {t('about.targets.perDay', {
                  amount: formatAmount(locale, id, intake.amountPerDay),
                  unit: intake.unit,
                })}
                . <Source source={intake.source} />
              </li>
            );
          })}
        </ul>
        <p class="muted">
          {t('about.mealShare.source')} <Source source={scenario.mealShare.source} />
        </p>
      </section>

      <section class="card">
        <h3>{t('about.portions.heading')}</h3>
        <p>{t('about.portions.body')}</p>
        <ul class="sources">
          {playable.map((food) => (
            <li key={food.id}>
              {t('about.portions.row', {
                food: food.names[locale],
                grams: number.format(food.portion.servingGramsAsEaten),
                state: t(`foods.state.${food.portion.state}`),
                yield: number.format(food.portion.cookedYieldFactor),
              })}
              <br />
              <span class="muted">
                {t('about.portions.servingSource')} <Source source={food.portion.servingSource} />.{' '}
                {t('about.portions.yieldSource')} <Source source={food.portion.yieldSource} />.
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section class="card">
        <h3>{t('about.licence.heading')}</h3>
        <p>{t('about.licence.body')}</p>
      </section>
    </main>
  );
}
