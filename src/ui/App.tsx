import { useEffect, useMemo, useState } from 'preact/hooks';
import gameData from 'virtual:game-data';

import { mealTargets, scorePlate } from '../domain/scoring.ts';
import type { PlateItem } from '../domain/scoring.ts';
import { LOCALES } from '../domain/types.ts';
import type { Locale, PlayableFood } from '../domain/types.ts';
import { LOCALE_NAMES, detectLocale, isLocale, translate } from '../i18n/index.ts';
import type { Params, StringKey } from '../i18n/index.ts';
import { readStored, writeStored } from '../storage.ts';
import { About } from './About.tsx';
import { FoodList } from './FoodList.tsx';
import { ScorePanel } from './ScorePanel.tsx';

export type Translate = (key: StringKey, params?: Params) => string;
type View = 'play' | 'about';
type Plate = Readonly<Record<string, number>>;

function initialLocale(): Locale {
  const stored = readStored('locale');
  return isLocale(stored) ? stored : detectLocale(globalThis.navigator?.languages ?? []);
}

export function App() {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [view, setView] = useState<View>('play');
  const [plate, setPlate] = useState<Plate>({});

  const t: Translate = (key, params) => translate(locale, key, params);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate(locale, 'app.title');
    writeStored('locale', locale);
  }, [locale]);

  // The build guarantees at least one scenario whose profile exists.
  const scenario = gameData.scenarios[0];
  const profile = gameData.referenceProfiles.find(
    (candidate) => candidate.id === scenario?.referenceProfileId,
  );
  if (scenario === undefined || profile === undefined) {
    throw new Error('game data has no usable scenario');
  }

  const playable = useMemo(
    () => gameData.foods.filter((food): food is PlayableFood => food.status === 'playable'),
    [],
  );
  const targets = useMemo(
    () => mealTargets(profile, scenario, gameData.scoring),
    [profile, scenario],
  );
  const items: PlateItem[] = playable
    .filter((food) => (plate[food.id] ?? 0) > 0)
    .map((food) => ({
      foodId: food.id,
      servings: plate[food.id] ?? 0,
      perServing: food.perServing,
    }));
  const score = scorePlate(items, targets);

  const change = (foodId: string, delta: number) =>
    setPlate((current) => {
      const next = Math.max(0, (current[foodId] ?? 0) + delta);
      return { ...current, [foodId]: next };
    });

  return (
    <div class="app">
      <header class="top">
        <div class="brand">
          <h1>{t('app.title')}</h1>
          <span class="badge">{t('app.prototype')}</span>
        </div>
        <div class="controls">
          <div class="segmented" role="group" aria-label={t('lang.label')}>
            {LOCALES.map((code) => (
              <button
                type="button"
                key={code}
                lang={code}
                aria-pressed={locale === code}
                onClick={() => setLocale(code)}
              >
                {LOCALE_NAMES[code]}
              </button>
            ))}
          </div>
          <button type="button" class="link" onClick={() => setView(view === 'play' ? 'about' : 'play')}>
            {view === 'play' ? t('nav.about') : t('nav.play')}
          </button>
        </div>
      </header>

      <p class="notice">{t('app.prototypeNotice')}</p>

      {view === 'about' ? (
        <About t={t} locale={locale} data={gameData} scenario={scenario} profile={profile} />
      ) : (
        <main>
          <section class="card scenario" aria-labelledby="scenario-heading">
            <p class="eyebrow" id="scenario-heading">
              {t('scenario.heading')}
            </p>
            <h2>{scenario.title[locale]}</h2>
            <p>{scenario.description[locale]}</p>
          </section>

          <div class="columns">
            <FoodList
              t={t}
              locale={locale}
              foods={gameData.foods}
              plate={plate}
              onChange={change}
            />
            <div class="side">
              <section class="card" aria-labelledby="plate-heading">
                <h2 id="plate-heading">{t('plate.heading')}</h2>
                {items.length === 0 ? (
                  <p class="muted">{t('plate.empty')}</p>
                ) : (
                  <>
                    <ul class="plate">
                      {playable
                        .filter((food) => (plate[food.id] ?? 0) > 0)
                        .map((food) => (
                          <li key={food.id}>
                            {t('plate.item', {
                              count: plate[food.id] ?? 0,
                              food: food.names[locale],
                            })}
                          </li>
                        ))}
                    </ul>
                    <button type="button" class="link" onClick={() => setPlate({})}>
                      {t('plate.clear')}
                    </button>
                  </>
                )}
              </section>
              <ScorePanel
                t={t}
                locale={locale}
                score={score}
                foodName={(id) =>
                  playable.find((food) => food.id === id)?.names[locale] ?? id
                }
              />
            </div>
          </div>
        </main>
      )}

      <footer class="foot">
        <p>{t('app.disclaimer')}</p>
      </footer>
    </div>
  );
}
