import type { Locale } from '../domain/types';
import { STRINGS } from '../i18n/strings';

interface HeaderProps {
  locale: Locale;
  onChangeLocale: (next: Locale) => void;
  onOpenAbout: () => void;
}

export function Header({ locale, onChangeLocale, onOpenAbout }: HeaderProps) {
  const s = STRINGS[locale];

  return (
    <header class="site-header">
      <div class="brand-block">
        <div class="brand-title-row">
          <h1 class="brand-title">{s.appName}</h1>
          <span class="prototype-tag">{s.prototypeBadge}</span>
        </div>
        <p class="brand-tagline">{s.appTagline}</p>
      </div>

      <div class="header-actions">
        <div class="lang-switch" role="group" aria-label={s.languageToggleLabel}>
          <button
            type="button"
            id="lang-es-btn"
            class={`lang-btn ${locale === 'es' ? 'is-active' : ''}`}
            aria-pressed={locale === 'es'}
            onClick={() => onChangeLocale('es')}
          >
            ES
          </button>
          <button
            type="button"
            id="lang-en-btn"
            class={`lang-btn ${locale === 'en' ? 'is-active' : ''}`}
            aria-pressed={locale === 'en'}
            onClick={() => onChangeLocale('en')}
          >
            EN
          </button>
        </div>

        <button
          type="button"
          id="open-about-btn"
          class="ghost-btn"
          onClick={onOpenAbout}
        >
          {s.aboutButton}
        </button>
      </div>
    </header>
  );
}
