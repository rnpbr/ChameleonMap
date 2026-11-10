import { TranslationService } from './translation.service';

/**
 * How far to trust a network's data and when it last changed -- shown
 * next to the network's name in both popups. Built from the
 * provenance fields chameleon_api sends on each popup institution.
 */
export interface Provenance {
  verified: boolean;
  // Badge text: "Confirmed" / "Unconfirmed" (by the institution)
  label: string;
  // Shown on hover/focus of the badge: who verified it and when, or
  // what unconfirmed means
  tooltip: string;
  // "3 Nov 2026", or null when the backend has no update date
  updatedOn: string | null;
  latestChangeUrl: string | null;
}

/**
 * Null when the institution carries no provenance at all (a Chameleon
 * backend that doesn't send it): nothing is shown then.
 */
export function provenanceOf(
  institution: PopupInstitution, translation: TranslationService,
): Provenance | null {
  if (!institution.trust_level) {
    return null;
  }
  const t = (key: string) => translation.t(key);
  const verified = institution.trust_level === 'verified';
  const verifiedOn = institution.verified_on ? translation.formatDate(institution.verified_on) : '';
  const verifiedBy = [institution.verified_by, verifiedOn].filter(Boolean).join(' · ');

  return {
    verified,
    label: verified ? t('trust_verified') : t('trust_ai_generated'),
    tooltip: verified
      ? `${t('verified_by')} ${verifiedBy}`.trim()
      : t('trust_ai_generated_tooltip'),
    updatedOn: institution.data_updated_on ? translation.formatDate(institution.data_updated_on) : null,
    latestChangeUrl: safeHttpUrl(institution.data_updated_url),
  };
}

/** Only http(s) links make it into an href; anything else is dropped. */
function safeHttpUrl(url: string | null | undefined): string | null {
  return url && /^https?:\/\//i.test(url) ? url : null;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Inline stroke icons (currentColor), shared by both popups
export const ICON_UNCONFIRMED = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
export const ICON_VERIFIED = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"></path><polyline points="22 4 12 14 9 11"></polyline></svg>';
export const ICON_CALENDAR = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';

/**
 * The badge + "Updated …" row of the small Leaflet popup. That popup
 * is a raw HTML string (not an Angular template), so every value from
 * the data is escaped here.
 */
export function provenanceRowHtml(institution: PopupInstitution, translation: TranslationService): string {
  const provenance = provenanceOf(institution, translation);
  if (!provenance) {
    return '';
  }
  const kind = provenance.verified ? 'verified' : 'ai';
  const tooltip = escapeHtml(provenance.tooltip);
  let html =
    '<div class="opp-provenance">' +
    `<span class="opp-trust opp-trust--${kind}" tabindex="0" data-tooltip="${tooltip}" ` +
    `aria-label="${escapeHtml(provenance.label)}. ${tooltip}">` +
    (provenance.verified ? ICON_VERIFIED : ICON_UNCONFIRMED) +
    `<span>${escapeHtml(provenance.label)}</span></span>`;
  if (provenance.updatedOn) {
    html +=
      '<span class="opp-updated">' + ICON_CALENDAR +
      `<span>${escapeHtml(translation.t('updated_on'))} ${escapeHtml(provenance.updatedOn)}</span></span>`;
  }
  return html + '</div>';
}
