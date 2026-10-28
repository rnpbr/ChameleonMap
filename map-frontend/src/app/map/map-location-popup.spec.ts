import { PopupContentService } from './popup-content.service';

function createLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: 1,
    name: 'Site A',
    latitude: 0,
    longitude: 0,
    description: '',
    overlayed_popup_content: '',
    active: true,
    onMap: true,
    activeColors: ['#E74C3C'],
    locationMarker: {},
    popupDto: {
      location_id: 1,
      title: 'Site A',
      description_html: 'Desc',
      has_overlay: false,
      tags: [],
    },
    interactionsAttached: false,
    ...overrides,
  };
}

function ensureLocationPopup(
  location: Location,
  popupContent: PopupContentService
): string {
  if (!location.popup) {
    location.popup = popupContent.buildLocationPopup(location.id, location.popupDto);
  }
  return location.popup;
}

function attachLocationInteractions(
  location: Location,
  popupContent: PopupContentService
): boolean {
  if (location.interactionsAttached) {
    return false;
  }
  ensureLocationPopup(location, popupContent);
  location.interactionsAttached = true;
  return true;
}

describe('lazy location popup attach', () => {
  const popupContent = new PopupContentService();

  it('builds popup HTML only when ensureLocationPopup is called', () => {
    const location = createLocation();
    expect(location.popup).toBeUndefined();

    const html = ensureLocationPopup(location, popupContent);

    expect(html).toContain('Site A');
    expect(location.popup).toBe(html);
  },

  it('attachLocationInteractions is idempotent', () => {
    const location = createLocation();

    expect(attachLocationInteractions(location, popupContent)).toBe(true);
    expect(location.interactionsAttached).toBe(true);
    expect(location.popup).toContain('Site A');

    expect(attachLocationInteractions(location, popupContent)).toBe(false);
  });
});
