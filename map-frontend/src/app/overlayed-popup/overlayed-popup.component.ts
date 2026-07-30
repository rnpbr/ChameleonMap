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

@Component({
  selector: 'app-overlayed-popup',
  templateUrl: './overlayed-popup.component.html',
  styleUrls: ['./overlayed-popup.component.css']
})

export class OverlayedPopupComponent {
  @ViewChild(SubMapComponent) subMap: SubMapComponent;
  @ViewChild('overlayed_popup_conteiner') overlayedPopupContainer: ElementRef;
  @ViewChild('newtab_button') newtabButton: ElementRef;
  @ViewChild('opp_title') overlayedPopupTitle: ElementRef;

  // Data
  private _currentKeeper: Location | Tag;
  private _currentKeeperType: string;
  private _locations: Array<Location>;
  private _tags: Array<Tag>;

  // Control
  private _isActive: boolean;

  // Parent Methods
  @Input() locations: any;
  @Input() tags: any;
  @Input() getLocationById: any;
  @Input() getTagById: any;

  constructor() {
    this._isActive = false;
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
    this.setNewTabButtonLink();

    this.overlayedPopupContainer.nativeElement.classList.remove('hidden');
    this._isActive = true;
  }

  public activateByLocation(location: Location | null) {
    if (location !== null) {
      this._currentKeeperType = 'location';
      this._currentKeeper = this.getLocationById(location.id);

      this.overlayedPopupTitle.nativeElement.innerHTML = `<div>${this.getPopupTitle()}</div>`;
      this.subMap.keeper = this._currentKeeper;

      this.setNewTabButtonLink();

      this.overlayedPopupContainer.nativeElement.classList.remove('hidden');
      this._isActive = true;
    }
  }

  public activateWithPersonalizedContent(content: string, title: string) {
    if (location !== null) {
      // this._currentKeeperType = 'location';
      // this._currentKeeper = this.getLocationById(location.id);

      this.overlayedPopupTitle.nativeElement.innerHTML = `<div>${title}</div>`;
      // this.subMap.keeper = this._currentKeeper;
      this.subMap.setContentDirectly(content)
      // this.setNewTabButtonLink();

      this.overlayedPopupContainer.nativeElement.classList.remove('hidden');
      this._isActive = true;
    }
  }

  public desactivate() {
    this.overlayedPopupContainer.nativeElement.classList.add('hidden');
    this._isActive = false;
  }


  private setCurrentKeeperByButtonId(buttonId: string) {
    if (buttonId.includes('location')) {
      this._currentKeeperType = 'location';
      this._currentKeeper = this.getLocationById(this.getLocationIdByButtonHtmlId(buttonId));
    } else if (buttonId.includes('tag')) {
      this._currentKeeperType = 'tag';
      this._currentKeeper = this.getTagById(this.getTagIdByButtonHtmlId(buttonId));
    }

    // Set title
    this.overlayedPopupTitle.nativeElement.innerHTML = `<div>${this.getPopupTitle()} <span style="font-size: smaller; font-weight: normal;">(Dados obtidos de: <a href="https://sos-rs.com/">SOS-RS</a>)</span></div>`;

    // Set Content
    this.subMap.keeper = this._currentKeeper;
  }

  private getPopupTitle(): string {
    const name = this._currentKeeper.name;
    return name;
  }

  private setNewTabButtonLink(type: string = this._currentKeeperType, id: number = this._currentKeeper.id) {
    this.newtabButton.nativeElement.setAttribute('routerLink', `${type}/detail/${id}`)
    this.newtabButton.nativeElement.setAttribute('href', `${type}/detail/${id}`)
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
    return `<img src="assets/expand-icon.png" class='opp-open-button opp-open-button-for-location opp-expand-icon' id='opp-location-${location.id}'>`;
  }

  public getOverlayedPopupButtonForTag(tag: Tag): string {
    return `<img src="assets/expand-icon.png" class='opp-open-button opp-open-button-for-tag opp-expand-icon' id='opp-tag-${tag.id}'>`;
  }
}
