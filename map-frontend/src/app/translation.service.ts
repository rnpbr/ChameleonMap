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
