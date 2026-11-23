import { useEffect } from 'preact/hooks';
import {
  SCORED_NUTRIENTS,
  type AndeanCropsDataset,
  type DerivedCrop,
  type Locale,
  type PortionsFile,
  type ReferenceIntakesFile,
} from '../domain/types';
import { STRINGS, formatNumber, interpolate } from '../i18n/strings';

interface AboutModalProps {
  locale: Locale;
  dataset: AndeanCropsDataset;
  referenceIntakes: ReferenceIntakesFile;
  portions: PortionsFile;
  allCrops: DerivedCrop[];
  onClose: () => void;
}

export function AboutModal({
  locale,
  dataset,
  referenceIntakes,
  portions,
  allCrops,
  onClose,
}: AboutModalProps) {
  const s = STRINGS[locale];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const cropsWithCredits = allCrops.filter((c) => Boolean(c.image?.credit));

  return (
    <div
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div class="modal-card">
        <div class="modal-header">
          <h2 id="about-modal-title" class="modal-title">
            {s.aboutTitle}
          </h2>
          <button
            type="button"
            id="close-about-btn"
            class="ghost-btn"
            onClick={onClose}
          >
            {s.closeButton}
          </button>
        </div>

        <section class="modal-section">
          <p>
            <strong>{s.disclaimerBanner}</strong>
          </p>
          <p>{s.prototypeReviewNote}</p>
        </section>

        <section class="modal-section">
          <h3>{s.aboutDatasetHeading}</h3>
          <p>
            {interpolate(s.aboutDatasetVersion, {
              version: dataset.metadata.version,
            })}{' '}
            ·{' '}
            {interpolate(s.aboutDatasetDate, {
              date: dataset.metadata.date,
            })}
          </p>
          <p>
            <a
              href="https://github.com/infpurewhite/andean-crops"
              target="_blank"
              rel="noreferrer"
            >
              {s.aboutDatasetLinkLabel}
            </a>
          </p>
        </section>

        <section class="modal-section">
          <h3>{s.aboutTargetsHeading}</h3>
          <p>{referenceIntakes.profileLabel[locale]}</p>
          <ul class="citation-list">
            {SCORED_NUTRIENTS.map((nutrient) => {
              const entry = referenceIntakes.nutrients[nutrient];
              return (
                <li key={nutrient} class="citation-item">
                  <strong>
                    {s.nutrientNames[nutrient]}:{' '}
                    {formatNumber(entry.dailyTarget, locale, 1)} {entry.unit}/d
                  </strong>
                  <div>
                    {s.aboutSourceLabel} {entry.source}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section class="modal-section">
          <h3>{s.aboutPortionsHeading}</h3>
          <ul class="citation-list">
            {Object.entries(portions.portions).map(([cropId, rule]) => {
              const crop = allCrops.find((c) => c.id === cropId);
              const name = crop ? crop.names[locale] : cropId;
              return (
                <li key={cropId} class="citation-item">
                  <strong>{name}</strong> — {s.aboutServingLabel}{' '}
                  {rule.servingGrams} g ({rule.preparedState[locale]}),{' '}
                  {s.aboutYieldLabel} {rule.cookedYieldFactor}×
                  <div>{rule.assumptionNote[locale]}</div>
                  <div>
                    {s.aboutSourceLabel} {rule.servingSource} {rule.yieldSource}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section class="modal-section">
          <h3>{s.aboutCreditsHeading}</h3>
          <div class="credits-grid">
            {cropsWithCredits.map((crop) => {
              const credit = crop.image!.credit;
              return (
                <div key={crop.id} class="credit-card">
                  <strong>{crop.names[locale]}</strong>
                  <div>
                    {s.aboutPhotoBy} {credit.author}
                  </div>
                  <div>
                    {s.aboutLicenceLabel}{' '}
                    <a
                      href={credit.licence_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {credit.licence}
                    </a>{' '}
                    ·{' '}
                    <a
                      href={credit.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Wikimedia
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section class="modal-section">
          <h3>{s.aboutLicencesHeading}</h3>
          <p>{s.aboutLicencesBody}</p>
        </section>
      </div>
    </div>
  );
}
