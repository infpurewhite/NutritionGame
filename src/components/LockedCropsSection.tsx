import { useState } from 'preact/hooks';
import type { DerivedCrop, Locale } from '../domain/types';
import { STRINGS, interpolate } from '../i18n/strings';

interface LockedCropsSectionProps {
  locale: Locale;
  lockedCrops: DerivedCrop[];
}

export function LockedCropsSection({
  locale,
  lockedCrops,
}: LockedCropsSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const s = STRINGS[locale];
  const baseUrl = import.meta.env.BASE_URL;

  return (
    <section class="locked-section" aria-labelledby="locked-heading">
      <div class="section-header-row">
        <div>
          <h2 id="locked-heading" class="section-heading">
            {s.lockedHeading} ({lockedCrops.length})
          </h2>
          <p class="section-sub">{s.lockedSubtitle}</p>
        </div>

        <button
          type="button"
          id="toggle-locked-btn"
          class="ghost-btn"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded
            ? s.hideLockedToggle
            : interpolate(s.showLockedToggle, { count: lockedCrops.length })}
        </button>
      </div>

      {expanded && (
        <div class="locked-grid">
          {lockedCrops.map((crop) => {
            const name = crop.names[locale];
            const reasonText =
              crop.lockReason === 'unverified'
                ? s.lockReasonUnverified
                : s.lockReasonNoData;

            return (
              <article key={crop.id} class="locked-card" aria-label={name}>
                <div class="locked-card-media">
                  {crop.image && (
                    <img
                      class="locked-card-img"
                      src={`${baseUrl}${crop.image.file}`}
                      alt={name}
                      loading="lazy"
                    />
                  )}
                  <div class="food-card-badges">
                    <span class="card-badge">{s.comingSoonBadge}</span>
                  </div>
                </div>
                <div class="locked-card-body">
                  <h3 class="locked-card-name">{name}</h3>
                  <div class="food-card-sci">{crop.scientificName}</div>
                  <div class="locked-reason">{reasonText}</div>
                  {crop.toxicRawWarning && (
                    <p class="toxic-warning" role="note">
                      {s.tarwiSafetyWarning}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
