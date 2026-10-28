import { Injectable } from '@angular/core';

export const LOCATION_POPUP_HEADER =
  "<div style='max-height:calc(100vh - 500px); min-height: 180px; overflow:scroll; overflow-x:hidden; margin-top: 20px; margin-right:0px; margin-left: 10px; text-align: justify;'>";

@Injectable()
export class PopupContentService {
  getLocationOverlayButton(locationId: number): string {
    return `<img src="assets/expand-icon.png" class='opp-open-button opp-open-button-for-location opp-expand-icon' id='opp-location-${locationId}'>`;
  }

  getTagOverlayButton(tagId: number): string {
    return `<img src="assets/expand-icon.png" class='opp-open-button opp-open-button-for-tag opp-expand-icon' id='opp-tag-${tagId}'>`;
  }

  buildLocationPopup(locationId: number, popupDto: LocationPopupDto | undefined): string {
    if (!popupDto) {
      return LOCATION_POPUP_HEADER;
    }

    let popup = LOCATION_POPUP_HEADER;
    const overlayButton = popupDto.has_overlay
      ? this.getLocationOverlayButton(locationId)
      : '';

    popup +=
      '<div style="margin-right: 10px;"><h1 class="popup-title">' +
      popupDto.title +
      ' ' +
      overlayButton +
      '</h1><hr>';

    if (popupDto.description_html && popupDto.description_html !== 'nan') {
      popup +=
        '<div style = "border-top: 1px; margin-top: -5px; margin-bottom: 15px"> <p>' +
        popupDto.description_html +
        '</p> </div> ';
    }

    popupDto.tags.forEach((tagSection: TagPopupSectionDto) => {
      if (!tagSection.description_html) {
        return;
      }

      const tagOverlayButton = tagSection.has_overlay
        ? this.getTagOverlayButton(tagSection.tag_id)
        : '';

      popup += `
      <div class="tag-popup-${tagSection.tag_id}">
        <h3 class="popup-subtitle">
          ${tagSection.name} ${tagOverlayButton}
        </h3>
        <p>${tagSection.description_html}</p>
      </div>
      `;
    });

    return popup;
  }
}
