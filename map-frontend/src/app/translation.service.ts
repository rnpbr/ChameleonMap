import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'pt'];
export const SOURCE_LANGUAGE = 'en';

/** English fallbacks, shown until the uiStrings request resolves */
const DEFAULT_LABELS: Record<string, string> = {
  link_details: 'Link Details',
  connected_to: 'Connected to:',
  managed_by: 'Managed by:',
  close: 'Close',
  owned_by: 'Owned by',
  institutions_plural: 'institutions',
  report_correction_prompt: 'Something wrong or outdated in the information about',
  report_correction: 'Report a correction',
  report_correction_hint: 'Opens your email app with the institution pre-filled',
  data_notice_title: 'About the data on this map',
  data_notice_body: 'REN Map is a community project, not an official source. The network topologies were compiled semi-automatically and partly extracted with AI, so some information may be wrong or out of date.',
  data_notice_levels: 'Every network shows its level and when its topology was last updated. Spotted a mistake? Use "Report a correction" in any network, or propose a fix on GitHub.',
  data_notice_learn_more: 'How the data is maintained',
  data_notice_dismiss: 'Got it',
  data_notice_reminder: 'Unofficial data · partly AI-extracted',
  data_notice_reminder_hint: 'Topologies were compiled semi-automatically and partly with AI. Click to read the full notice.',
  trust_ai_generated: 'AI-generated',
  trust_ai_generated_hint: 'extracted automatically, not yet checked',
  trust_ai_generated_tooltip: "This data was extracted automatically and hasn't been reviewed by a person yet.",
  trust_verified: 'Verified',
  trust_verified_hint: 'reviewed by a member of the community',
  verified_by: 'Verified by',
  updated_on: 'Updated',
  topology_updated_on: 'Topology updated',
  view_latest_change: 'View latest change',
};

/**
 * Returns the browser's preferred language, normalized to one of
 * SUPPORTED_LANGUAGES (e.g. "pt-BR" -> "pt"). Falls back to
 * SOURCE_LANGUAGE if the browser's language isn't supported.
 *
 * A "?lang=xx" query parameter, if present and supported, overrides
 * the browser's language -- mainly for testing/QA, so a specific
 * language can be previewed via a URL without changing browser/OS
 * language settings.
 */
export function detectBrowserLanguage(
  languages: readonly string[] = navigator.languages || [navigator.language],
): string {
  const langOverride = new URLSearchParams(location.search).get('lang')?.toLowerCase();
  if (langOverride && SUPPORTED_LANGUAGES.includes(langOverride)) {
    return langOverride;
  }

  for (const language of languages) {
    const normalized = language?.slice(0, 2).toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(normalized)) {
      return normalized;
    }
  }
  return SOURCE_LANGUAGE;
}

/**
 * Picks translated text (fixed map vocabulary, institution popup
 * content) for the browser's detected language out of the
 * translation arrays returned by the chameleon_api.
 */
@Injectable()
export class TranslationService {

  readonly language = detectBrowserLanguage();

  private labels: Record<string, string> = { ...DEFAULT_LABELS };

  constructor(private apiService: ApiService) {
    if (this.language !== SOURCE_LANGUAGE) {
      this.loadUiStrings();
    }
  }

  private loadUiStrings() {
    this.apiService.getUiStrings().subscribe(uiStrings => {
      uiStrings.forEach(uiString => {
        const translation = uiString.translations.find(t => t.language_code === this.language);
        this.labels[uiString.key] = translation?.text || uiString.text;
      });
    });
  }

  /** Returns the fixed map vocabulary text for the given key */
  t(key: string): string {
    return this.labels[key] || DEFAULT_LABELS[key] || key;
  }

  /**
   * Formats a YYYY-MM-DD day (as the API sends dates) for the detected
   * language, e.g. "3 Nov 2026" / "3 de nov. de 2026". Read and shown
   * in UTC so the day never shifts with the viewer's time zone.
   * Anything unparseable is returned as is.
   */
  formatDate(day: string): string {
    const date = new Date(`${day}T00:00:00Z`);
    if (isNaN(date.getTime())) {
      return day;
    }
    return new Intl.DateTimeFormat(this.language, {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    }).format(date);
  }

  /**
   * Picks the popup summary/full content for the browser's detected
   * language, falling back to the source-language (English) text.
   */
  translatePopup(institution: PopupInstitution): { description: string; overlayedPopupContent: string } {
    const translation = institution.translations?.find(t => t.language_code === this.language);
    return {
      description: translation?.description || institution.description || '',
      overlayedPopupContent: translation?.overlayed_popup_content || institution.overlayed_popup_content || '',
    };
  }
}
