import { 
  Component, 
  Inject, 
  OnInit, 
  ViewChild,
  ElementRef,
  Type,
  Input,
  AfterViewChecked
} from '@angular/core';
import { SubMapComponent } from '../sub-map/sub-map.component';
import { TranslationService } from '../translation.service';

@Component({
  selector: 'app-overlayed-popup',
  templateUrl: './overlayed-popup.component.html',
  styleUrls: ['./overlayed-popup.component.css']
})

export class OverlayedPopupComponent {
  @ViewChild(SubMapComponent) subMap: SubMapComponent;
  @ViewChild('overlayed_popup_conteiner') overlayedPopupContainer: ElementRef;
  @ViewChild('opp_title') overlayedPopupTitle: ElementRef;

  // Data
  private _currentKeeper: Location | Tag;
  private _currentKeeperType: string;
  private _locations: Array<Location>;
  private _tags: Array<Tag>;

  // Control
  private _isActive: boolean;

  // Which institution tab is active, when the current keeper is a
  // Location owned by more than one institution with popup content.
  public activeInstitutionIndex = 0;

  // Parent Methods
  @Input() locations: any;
  @Input() tags: any;
  @Input() getLocationById: any;
  @Input() getTagById: any;
  // Currently selected PREN(1)/NREN(2) menu -- a location can belong
  // to networks in both, and only the one matching this should show.
  @Input() currentMenuId: number;
  // Address the "Report a correction" footer link mails to -- from the
  // map settings; the footer is hidden when empty.
  @Input() correctionEmail: string;

  constructor(private translationService: TranslationService) {
    this._isActive = false;
  }

  /**
   * Institutions with popup content for the current Location keeper,
   * filtered to whichever network(s) match the currently selected
   * PREN/NREN menu (empty for a Tag keeper).
   */
  get currentInstitutions(): PopupInstitution[] {
    if (this._currentKeeperType === 'location' && this._currentKeeper) {
      const all = (this._currentKeeper as Location).popup_institutions || [];
      return all.filter(institution => institution.parent_menu === this.currentMenuId);
    }
    return [];
  }

  /** Institution whose tab is currently shown (undefined for a Tag keeper) */
  get activeInstitution(): PopupInstitution | undefined {
    return this.currentInstitutions[this.activeInstitutionIndex];
  }

  /**
   * mailto: link for the footer's "Report a correction", pre-filled
   * with the node and the active institution so the maintainers know
   * what the report is about. Null when there's no institution or no
   * configured address -- hides the footer.
   */
  get correctionMailto(): string | null {
    const institution = this.activeInstitution;
    if (!this.correctionEmail || !institution) {
      return null;
    }
    const nodeName = this._currentKeeper.name;
    const subject = `Correction request: ${nodeName} — ${institution.name}`;
    const body = `Node: ${nodeName}\nInstitution: ${institution.name}\n\nWhat is wrong or outdated:\n`;
    return `mailto:${this.correctionEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  /** Fixed map vocabulary, translated for the browser's detected language */
  public t(key: string): string {
    return this.translationService.t(key);
  }

  public selectInstitution(index: number) {
    this.activeInstitutionIndex = index;
    this.renderLocationContent();
  }

  private renderLocationContent() {
    const institution = this.activeInstitution;
    const content = institution ? this.translationService.translatePopup(institution).overlayedPopupContent : '';
    this.subMap.setContentDirectly(content);
  }

  get isActive() {
    return this._isActive;
  }

  ngOnChanges() {
    this._locations = this.locations;
    this._tags = this.tags;
  }

  public activate(buttonClickedEvent: any) {
    const buttonId: string = buttonClickedEvent.id;

    this.setCurrentKeeperByButtonId(buttonId);

    const popup = this.overlayedPopupContainer.nativeElement;
    popup.classList.add('visible');
    popup.classList.remove('hidden');
    this._isActive = true;
  }

  public activateByLocation(location: Location | null) {
    if (location !== null) {
      this._currentKeeperType = 'location';
      this._currentKeeper = this.getLocationById(location.id);
      this.activeInstitutionIndex = 0;

      const popup = this.overlayedPopupContainer.nativeElement;
      this.overlayedPopupTitle.nativeElement.innerHTML = `<div>${this.getPopupTitle()}</div>`;
      this.renderLocationContent();

      popup.classList.remove('hidden');
      this._isActive = true;
    }
  }

  public activateWithPersonalizedContent(content: string, title: string) {
    if (location !== null) {
      // this._currentKeeperType = 'location';
      // this._currentKeeper = this.getLocationById(location.id);

      const popup = this.overlayedPopupContainer.nativeElement;
      this.overlayedPopupTitle.nativeElement.innerHTML = `<div>${title}</div>`;
      // this.subMap.keeper = this._currentKeeper;
      this.subMap.setContentDirectly(content)

      popup.classList.add('visible');
      popup.classList.remove('hidden');
      this._isActive = true;
    }
  }

  public desactivate() {
    const popup = this.overlayedPopupContainer.nativeElement;
    popup.classList.add('hidden');
    popup.classList.remove('visible');
    this._isActive = false;
  }


  private setCurrentKeeperByButtonId(buttonId: string) {
    this.activeInstitutionIndex = 0;

    if (buttonId.includes('location')) {
      this._currentKeeperType = 'location';
      this._currentKeeper = this.getLocationById(this.getLocationIdByButtonHtmlId(buttonId));
    } else if (buttonId.includes('tag')) {
      this._currentKeeperType = 'tag';
      this._currentKeeper = this.getTagById(this.getTagIdByButtonHtmlId(buttonId));
    }

    // Set title
    this.overlayedPopupTitle.nativeElement.innerHTML = `<div>${this.getPopupTitle()}</div>`;

    // Set Content
    if (this._currentKeeperType === 'location') {
      this.renderLocationContent();
    } else {
      this.subMap.keeper = this._currentKeeper as Tag;
    }
  }

  private getPopupTitle(): string {
    const name = this._currentKeeper.name;
    return name;
  }

  private getLocationIdByButtonHtmlId(buttonId: string): number {
    return parseInt(buttonId.replace('opp-location-', ''));
  }

  private getTagIdByButtonHtmlId(buttonId: string): number {
    return parseInt(buttonId.replace('opp-tag-', ''));
  }

  public refactorHTMLStringWithQuotes(HTMLstring: string) {
    HTMLstring = HTMLstring.toString();
    HTMLstring = HTMLstring.replace(/\"/g, '&quot');
    HTMLstring = HTMLstring.replace(/&quot/g, '&quot ');
    HTMLstring = HTMLstring.replace(/\n|\r/g, '');

    return HTMLstring;
  }

  public getOverlayedPopupButtonForLocation(location: Location): string {
    return `<button type="button" class="opp-toggle opp-open-button opp-open-button-for-location" id='opp-location-${location.id}'>` +
      `<i class="fa fa-plus"></i></button>`;
  }

  public getOverlayedPopupButtonForTag(tag: Tag): string {
    return `<img src="assets/expand-icon.png" class='opp-open-button opp-open-button-for-tag opp-expand-icon' id='opp-tag-${tag.id}'>`;
  }
}
