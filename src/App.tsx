import { useEffect, useMemo, useState } from 'preact/hooks';
import datasetJson from './data/andean-crops.json';
import localNamesJson from './data/local-names.json';
import portionsJson from './data/portions.json';
import referenceIntakesJson from './data/reference-intakes.json';
import scenariosJson from './data/scenarios.json';
import { deriveCropAvailability } from './domain/crops';
import { evaluatePlate } from './domain/scoring';
import { readStorage, writeStorage } from './domain/storage';
import type {
  AndeanCropsDataset,
  Locale,
  LocalNamesFile,
  PlateItem,
  PortionsFile,
  ReferenceIntakesFile,
  Scenario,
} from './domain/types';
import { STRINGS, interpolate } from './i18n/strings';
import { AboutModal } from './components/AboutModal';
import { FoodCard } from './components/FoodCard';
import { Header } from './components/Header';
import { LockedCropsSection } from './components/LockedCropsSection';
import { PlatePanel } from './components/PlatePanel';

const LOCALE_STORAGE_KEY = 'nutritiongame:locale:v1';
const PLATE_STORAGE_KEY = 'nutritiongame:plate:v1';

const dataset = datasetJson as unknown as AndeanCropsDataset;
const localNames = localNamesJson as unknown as LocalNamesFile;
const portionsFile = portionsJson as unknown as PortionsFile;
const referenceIntakes = referenceIntakesJson as unknown as ReferenceIntakesFile;
const scenarios = scenariosJson as unknown as Scenario[];
const activeScenario = scenarios[0];

function loadInitialLocale(): Locale {
  const saved = readStorage(LOCALE_STORAGE_KEY);
  if (saved === 'es' || saved === 'en') return saved;
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en')) {
    return 'en';
  }
  return 'es';
}

function loadInitialPlate(): PlateItem[] {
  const raw = readStorage(PLATE_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is PlateItem =>
          typeof item?.cropId === 'string' &&
          typeof item?.servings === 'number' &&
          item.servings > 0
      );
    }
  } catch {
    // Ignore malformed saved state
  }
  return [];
}

export function App() {
  const [locale, setLocale] = useState<Locale>(loadInitialLocale);
  const [plateItems, setPlateItems] = useState<PlateItem[]>(loadInitialPlate);
  const [aboutOpen, setAboutOpen] = useState(false);

  const catalog = useMemo(
    () => deriveCropAvailability(dataset, localNames, portionsFile.portions),
    []
  );
  const allCrops = useMemo(
    () => [...catalog.playable, ...catalog.locked],
    [catalog]
  );

  const evaluation = useMemo(
    () =>
      evaluatePlate(
        plateItems,
        catalog.byId,
        portionsFile.portions,
        activeScenario,
        referenceIntakes
      ),
    [plateItems, catalog.byId]
  );

  const servingsMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of plateItems) {
      map[item.cropId] = item.servings;
    }
    return map;
  }, [plateItems]);

  useEffect(() => {
    writeStorage(LOCALE_STORAGE_KEY, locale);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  useEffect(() => {
    writeStorage(PLATE_STORAGE_KEY, JSON.stringify(plateItems));
  }, [plateItems]);

  function handleUpdateServings(cropId: string, delta: number) {
    setPlateItems((prev) => {
      const idx = prev.findIndex((i) => i.cropId === cropId);
      if (idx === -1) {
        if (delta <= 0) return prev;
        return [...prev, { cropId, servings: delta }];
      }
      const nextServings = Math.round((prev[idx].servings + delta) * 10) / 10;
      if (nextServings <= 0) {
        return prev.filter((i) => i.cropId !== cropId);
      }
      const next = [...prev];
      next[idx] = { cropId, servings: Math.min(10, nextServings) };
      return next;
    });
  }

  function handleClearPlate() {
    setPlateItems([]);
  }

  const s = STRINGS[locale];

  return (
    <>
      <div class="disclaimer-strip" role="note">
        {s.disclaimerBanner}
      </div>

      <div class="app-shell">
        <Header
          locale={locale}
          onChangeLocale={setLocale}
          onOpenAbout={() => setAboutOpen(true)}
        />

        <main class="workspace-grid">
          <PlatePanel
            locale={locale}
            scenario={activeScenario}
            plateItems={plateItems}
            evaluation={evaluation}
            cropsById={catalog.byId}
            portionsById={portionsFile.portions}
            onUpdateServings={handleUpdateServings}
            onClearPlate={handleClearPlate}
          />

          <div>
            <section aria-labelledby="playable-foods-heading">
              <div class="foods-section-header">
                <h2 id="playable-foods-heading" class="section-heading">
                  {s.playableFoodsHeading} ({catalog.playable.length})
                </h2>
                <p class="section-sub">{s.playableFoodsSubtitle}</p>
              </div>

              <div class="foods-grid">
                {catalog.playable.map((crop) => {
                  const portion = portionsFile.portions[crop.id];
                  if (!portion) return null;
                  return (
                    <FoodCard
                      key={crop.id}
                      locale={locale}
                      crop={crop}
                      portion={portion}
                      servingsOnPlate={servingsMap[crop.id] ?? 0}
                      onUpdateServings={handleUpdateServings}
                    />
                  );
                })}
              </div>
            </section>

            <LockedCropsSection locale={locale} lockedCrops={catalog.locked} />
          </div>
        </main>

        <footer class="site-footer">
          <span>{s.prototypeReviewNote}</span>
          <span>
            {interpolate(s.aboutDatasetVersion, {
              version: dataset.metadata.version,
            })}
          </span>
        </footer>
      </div>

      {aboutOpen && (
        <AboutModal
          locale={locale}
          dataset={dataset}
          referenceIntakes={referenceIntakes}
          portions={portionsFile}
          allCrops={allCrops}
          onClose={() => setAboutOpen(false)}
        />
      )}
    </>
  );
}
