import { TestBed } from '@angular/core/testing';
import { LOCATION_POPUP_HEADER, PopupContentService } from './popup-content.service';

describe('PopupContentService', () => {
  let service: PopupContentService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PopupContentService],
    });
    service = TestBed.inject(PopupContentService);
  });

  it('builds popup header and tag sections', () => {
    const html = service.buildLocationPopup(1, {
      location_id: 1,
      title: 'Location 1',
      description_html: '<p>Location desc</p>',
      has_overlay: true,
      tags: [
        {
          tag_id: 5,
          name: 'Tag 5',
          description_html: '<p>Tag desc</p>',
          has_overlay: false,
        },
      ],
    });

    expect(html.startsWith(LOCATION_POPUP_HEADER)).toBeTrue();
    expect(html).toContain('popup-title');
    expect(html).toContain('opp-location-1');
    expect(html).toContain('tag-popup-5');
    expect(html).toContain('Tag desc');
  });
});
