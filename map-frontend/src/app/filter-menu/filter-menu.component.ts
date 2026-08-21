import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ViewChild
} from '@angular/core';
import { EventEmitterService } from '../event-emitter.service';
import { PinnedMenusSidebarComponent } from './pinned-menus-sidebar/pinned-menus-sidebar.component';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { isKml, isLinksGroup, isTag } from '../map/map-behavior';

enum TagsMenuButtonBehavior {
  CloseAllEyes,
  OpenAllEyes
}

@Component({
  selector: 'app-filter-menu',
  templateUrl: './filter-menu.component.html',
  styleUrls: ['./filter-menu.component.css']
})
export class FilterMenuComponent {
  @ViewChild(PinnedMenusSidebarComponent) pinnedMenusSidebar: PinnedMenusSidebarComponent;

  get hasPinnedMenus(): boolean {
    return (this.pinnedMenusSidebar?._pinnedMenus?.length ?? 0) > 0;
  }

  public _menugroups: Array<MenuGroup>;
  private _menus: Array<Menu>;
  private _tags: Array<Tag>;
  private _kmlShapes: Array<KmlLayerDto>;
  private _linkGroups: Array<LinksGroup>;
  public _locations: Array<Location>;
  public _selectedTagsMenuId: number;
  private _selectedMenusByGroup: { [key: string]: number } ;
  public headerStyle: 'background:red';
  public isCollapsed = false;
  public _currentMenusPallete: string;
  public _hasMenuGroupTabs: boolean;
  public currentBehaviorOfMultipleTagsVisibilityButton: TagsMenuButtonBehavior = TagsMenuButtonBehavior.CloseAllEyes;
  tagsMenuButtonBehavior = TagsMenuButtonBehavior;
  public activeMenus: Array<Menu>;

  @Input()
  get menugroups() {
    return this._menugroups;
  }
  set menugroups(value) {
    this._menugroups = value;
    if (this._menus && this._menus.length > 0) {
      this.activeMenus = this.getActiveMenus();
    }
    this.updateAllMenuEyeBehaviors();
  }

  @Input()
  get menus() {
    return this._menus;
  }
  set menus(value) {
    if (value != undefined) {
      this._menus = value;
      this.activeMenus = this.getActiveMenus();
    }
    this.updateAllMenuEyeBehaviors();
  }

  @Input()
  get tags() {
    return this._tags;
  }
  set tags(value) {
    this._tags = value;
    this.updateAllMenuEyeBehaviors();
  }

  @Input()
  get linkGroups() {
    return this._linkGroups;
  }
  set linkGroups(value) {
    this._linkGroups = value;
    this.updateAllMenuEyeBehaviors();
  }

  @Input()
  get kmlShapes() {
    return this._kmlShapes;
  }
  set kmlShapes(value) {
    this._kmlShapes = value;
    this.updateAllMenuEyeBehaviors();
  }

  @Input()
  get locations() {
    return this._locations;
  }
  set locations(value) {
    this._locations = value;
  }

  @Input()
  get selectedTagsMenuId() {
    return this._selectedTagsMenuId;
  }
  set selectedTagsMenuId(value) {
    this._selectedTagsMenuId = value;
  }

  @Input()
  get selectedMenusByGroup() {
    return this._selectedMenusByGroup;
  }
  set selectedMenusByGroup(value) {
    this._selectedMenusByGroup = value;
  }

  @Input()
  get currentMenu() {
    return this._currentMenusPallete;
  }
  set currentMenu(value) {
    if (value != undefined) {
      this._currentMenusPallete = value;
      if (this._menus && this._menus.length > 0) {
        this.activeMenus = this.getActiveMenus();
      }
    }
  }

  @Input()
  get hasMenuGroupTabs() {
    return this._hasMenuGroupTabs;
  }
  set hasMenuGroupTabs(value) {
    this._hasMenuGroupTabs = value;
  }

  @Input()
  insertMarkersByMenu: any;

  @Output()
  linkRemoval = new EventEmitter();

  @Output()
  linkReactivated = new EventEmitter();

  @Output()
  menuCliked = new EventEmitter();

  @Output()
  tagRemoval = new EventEmitter();

  @Output()
  tagReactivated = new EventEmitter();

  @Output()
  shapeRemoval = new EventEmitter();

  @Output()
  shapeReactivated = new EventEmitter();

  get mapMarkers(): Array<MapMarkerType>{
   let markers: Array<MapMarkerType> = [];
   markers = markers.concat(this.tags).concat(this.linkGroups).concat(this.kmlShapes);
   return markers;
  }

  @Output()
  markerFocus = new EventEmitter<MapMarkerType>();

  @Output()
  menuFocus = new EventEmitter<Menu>();

  constructor(private eventEmitterService: EventEmitterService, private matIconRegistry: MatIconRegistry, private domSanitizer: DomSanitizer) {
    this.matIconRegistry.addSvgIcon(
      'eye-off',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/icons/eye-off.svg')
    );
  }

  ngOnInit() {
    if (this.eventEmitterService.subsVar == undefined) {
      this.eventEmitterService.subsVar =
        this.eventEmitterService.invokeFirstComponentFunction.subscribe(
          (name: string) => {
            this.menuCollapse();
          }
        );
    }
  }

  LGVisibilityClick(lg: any, event: any) {
    if (lg.visibility) {
      lg.visibility = false;
      this.removeLinesByLinkGroup(lg);
    } else {
      lg.visibility = true;
      this.insertLinesByLinkGroup(lg);
    }
    this.checkActiveMenuTagsVisibilityStatus(lg.parent_menu);
  }

  removeLinesByLinkGroup(lg: LinksGroup) {
    this.linkRemoval.emit({ selectedLG: lg });
  }

  insertLinesByLinkGroup(lg: LinksGroup) {
    this.linkReactivated.emit({ selectedLG: lg });
  }

  menuClick(menu: Menu) {
    if (this.selectedTagsMenuId !== menu.id) {
      let lastMenu = this.getMenuById(this.selectedTagsMenuId);
      if (lastMenu) {
        lastMenu.expanded = false;
      }
      menu.expanded = true;
      this.selectedTagsMenuId = menu.id;
      this.menuCliked.emit({ selectedTagsMenuId: this.selectedTagsMenuId });
      this.checkActiveMenuTagsVisibilityStatus(menu.id);
    }
  }

  onMenuNameClick(menu: Menu, event: Event) {
    event.stopPropagation();

    if (this.selectedTagsMenuId === menu.id) {
      this.menuFocus.emit(menu);
      return;
    }

    this.menuClick(menu);
  }

  closeAllEyes(menu: Menu, item: any, event: any) {
    event.stopPropagation();

    for (let i = 0; i < this._tags.length; i++) {
      if (this._tags[i].parent_menu == menu.id) {
        if (this._tags[i].visibility == true) {
          this.visibilityClick(this._tags[i], event);
        }
      }
    }

    for (let linkGroup of this._linkGroups) {
      if (linkGroup.parent_menu == menu.id) {
        linkGroup.visibility = false;
        this.removeLinesByLinkGroup(linkGroup);
      }
    }

    for (let shape of this._kmlShapes) {
      if (shape.parent_menu == menu.id) {
        if (shape.visibility) {
          this.kmlVisibilityClick(shape, event);
        }
      }
    }

    menu.isEyeVisibilityOpen = false;
  }

  openAllEyes(menu: Menu, item: any, event: any) {
    event.stopPropagation();

    for (let i = 0; i < this._tags.length; i++) {
      if (this._tags[i].parent_menu == menu.id) {
        if (this._tags[i].visibility == false) {
          this.visibilityClick(this._tags[i], event);
        }
      }
    }

    for (let linkGroup of this._linkGroups) {
      if (linkGroup.parent_menu == menu.id) {
        if (!linkGroup.visibility) {
          this.LGVisibilityClick(linkGroup, event);
        }
      }
    }

    for (let shape of this._kmlShapes) {
      if (shape.parent_menu == menu.id) {
        if (!shape.visibility) {
          this.kmlVisibilityClick(shape, event);
        }
      }
    }

    menu.isEyeVisibilityOpen = true;
  }

  menuSwitch(menu: Menu, event: any) {
    menu.expanded = !menu.expanded;
    event.stopPropagation();
  }

  onMenuLockClicked(menu: Menu, event: any) {
    event.stopPropagation();
    if (menu.pinned) {
      this.unlockMenuButtonClicked(menu, event);
    } else {
      this.lockMenuButtonClicked(menu, event);
    }
  }

  lockMenuButtonClicked(menu: Menu, event: any) {
    menu.pinned = true;
    this.pinnedMenusSidebar?.addPinnedMenu(menu);
    this.menuCliked.emit({ selectedTagsMenuId: this.selectedTagsMenuId });
    event.stopPropagation();
  }

  unlockMenuButtonClicked(menu: Menu, event: any) {
    menu.pinned = false;
    this.pinnedMenusSidebar?.removePinnedMenu(menu);
    this.menuCliked.emit({ selectedTagsMenuId: this.selectedTagsMenuId });
    event.stopPropagation();
  }

  sideBarUnpinMenuButtonClicked(menu: Menu) {
    this.unlockMenuButtonClicked(menu, {} as Event);
  }

  onLockedMenuSelected(menu: Menu) {
    this.menuClick(menu);
  }

  menuCollapse() {
    this.isCollapsed = !this.isCollapsed;
    const menufilter = document.querySelectorAll<HTMLElement>('.scrollbar-box');
    for (let i = 0, len = menufilter.length; i < len; i++) {
      if (this.isCollapsed) {
        menufilter[i].setAttribute('style', 'left: -312px;');
      } else {
        menufilter[i].setAttribute('style', 'left: 15px;');
      }
    }
  }


  getMarkerType(marker: MapMarkerType): string{
    if (!marker) return 'undefined';
    if (isKml(marker)) return 'KmlLayerDto';
    if ('kml_file' in marker) return 'KmlShape';
    if (isLinksGroup(marker)) return 'LinksGroup';
    if (isTag(marker)) return 'Tag';
    return 'undefined';
  }

  getMarkerColor(marker: MapMarkerType){
    let color = 'rgb(154, 154, 154)'

    if(this.isMarkerTag(marker)){
      color = marker.color;
    }else if(this.isMarkerKmlLayerDto(marker) || this.isMarkerLinksGroup(marker)){ 
      color = marker.links_color
    }

    return color;
  }
  getMarkerCurrentColor(marker: MapMarkerType){
    let color = 'rgb(154, 154, 154)'

    if(this.isMarkerTag(marker)){
      color = marker.currentColor;
    }else if(this.isMarkerKmlLayerDto(marker)){
      color = marker.currentColor;
    }else if(this.isMarkerLinksGroup(marker)){
      color = marker.currentColor
    }

    return color;
  }

  isMarkerTag(marker: MapMarkerType): marker is Tag{
    return isTag(marker);
  }
  isMarkerLinksGroup(marker: MapMarkerType): marker is LinksGroup{
    return isLinksGroup(marker);
  }
  isMarkerKmlLayerDto(marker: MapMarkerType): marker is KmlLayerDto{
    return isKml(marker);
  }

  getMarkerIconClass(marker: MapMarkerType): string {
    if (this.isMarkerTag(marker)) return 'tag-item-icon';
    if (this.isMarkerLinksGroup(marker)) return 'links-item-icon';
    return '';
  }

  getMarkerDisplayColor(marker: MapMarkerType): string {
    const isSelectedAndVisible =
      this.selectedTagsMenuId === marker.parent_menu && marker.visibility;
    const hasCustomColor = marker.currentColor !== this.getMarkerColor(marker);
    return isSelectedAndVisible || hasCustomColor
      ? marker.currentColor
      : 'rgb(154, 154, 154)';
  }

  isMarkerActive(marker: MapMarkerType): boolean{
    let activity: boolean = true;
    if(this.isMarkerTag(marker)){
      activity = marker.active && marker.dependenciesActive;
    }

    return activity;
  }

  onMarkerToogleVisibilityButtonClick(marker: MapMarkerType, event: any){
    if(typeof marker === "object"){
      event.stopPropagation();
      switch(this.getMarkerType(marker)){
        case 'Tag':
          this.visibilityClick(marker, event);
          break;
        case 'KmlLayerDto':
          this.kmlVisibilityClick(marker, event);      
          break;
        case 'LinksGroup':
          this.LGVisibilityClick(marker, event);
          break;
      }
    }
  }

  visibilityClick(tag: any, event: any) {
    if (tag.parent_menu !== this.selectedTagsMenuId) {
      const beforeState = this.selectedTagsMenuId;
      this.selectedTagsMenuId = tag.parent_menu;
      this.menuCliked.emit({ selectedTagsMenuId: this.selectedTagsMenuId });
      this.switchVisibility(tag);
      this.selectedTagsMenuId = beforeState;
      this.menuCliked.emit({ selectedTagsMenuId: this.selectedTagsMenuId });
    } else this.switchVisibility(tag);

    if (tag.parent_menu === this.selectedTagsMenuId)
      this.checkActiveMenuTagsVisibilityStatus(tag.parent_menu);
  }

  kmlVisibilityClick(kmlShape: any, event: any) {
    kmlShape.visibility = !kmlShape.visibility;

    if (kmlShape.parent_menu === this.selectedTagsMenuId) {
      if (kmlShape.visibility)
        this.insertKmlShape(kmlShape)
      else
        this.removeKmlShape(kmlShape)
    }

    if (kmlShape.parent_menu === this.selectedTagsMenuId)
      this.checkActiveMenuTagsVisibilityStatus(kmlShape.parent_menu);
  }

  pinClick(marker: any, event: any) {
    event.stopPropagation();
    let color = this.getMarkerColor(marker);
    let currentColor = this.getMarkerCurrentColor(marker);
    if (currentColor === color) {
      marker.currentColor = '#AFBAC4';
    } else {
      marker.currentColor = color;
    }
    this.menuCliked.emit({ selectedTagsMenuId: this.selectedTagsMenuId });
  }

  getMenuById(id: number) {
    for (const menu of this._menus) {
      if (menu.id === id) {
        return menu;
      }
    }
    return null;
  }

  focusMarkerOnMap(marker: MapMarkerType) {
    if (!marker || !marker.visibility) return;
    this.markerFocus.emit(marker);
  }

  checkActiveMenuTagsVisibilityStatus(menuId: number) {
    if (!this._tags && !this._kmlShapes && !this._linkGroups) {
      return;
    }

    let allItemsAreClosed = true;

    this._tags?.forEach(tag => {
      if (tag.parent_menu === menuId && tag.visibility) {
        allItemsAreClosed = false;
      }
    });

    this._kmlShapes?.forEach(shape => {
      if (shape.parent_menu === menuId && (shape.visibility || shape.visibility == undefined)) {
        allItemsAreClosed = false;
      }
    });

    this._linkGroups?.forEach(linkGroup => {
      if (linkGroup.parent_menu === menuId && linkGroup.visibility) {
        allItemsAreClosed = false;
      }
    });

    const menu = this.getMenuById(menuId);
    if (menu) {
      menu.isEyeVisibilityOpen = !allItemsAreClosed;
    }
  }

  updateAllMenuEyeBehaviors() {
    if (this.activeMenus) {
      this.activeMenus.forEach(menu => {
        this.checkActiveMenuTagsVisibilityStatus(menu.id);
      });
    }
  }

  switchVisibility(tag: any) {
    if (tag.dependenciesActive) {
      if (tag.visibility) {
        tag.visibility = false;
        this.removeMarkersByTag(tag);
      } else {
        if (tag.parent_menu === this.selectedTagsMenuId) {
          tag.visibility = true;
          this.insertMarkersByTag(tag);
        }
      }
    }
  }

  getGroupNameId(name: string): number | null {
    if (!this.menugroups) {
      return null
    }
    for (let group of this.menugroups) {
      if (name == group.name) {
        return group.id;
      }
    }
    return null;
  }

  removeMarkersByTag(tag: Tag) {
    this.tagRemoval.emit({ selectedTag: tag });
  }

  insertMarkersByTag(tag: any) {
    this.tagReactivated.emit({ tag: tag });
  }

  removeKmlShape(kmlShape: KmlLayerDto) {
    this.shapeRemoval.emit({ shape: kmlShape });
  }

  insertKmlShape(kmlShape: KmlLayerDto) {
    this.shapeReactivated.emit({ shape: kmlShape });
  }

  getActiveMenus(): Array<Menu> {
    if (this._currentMenusPallete == "Links") {
      return [];
    }
    if (this._menus && this._menus.length > 0) {
      let menus = this._menus
      let activeMenus = menus.filter((menu) => {
        var menuGroupSelected = true;
        if (this) {
          menuGroupSelected = menu.group == this.getGroupNameId(this._currentMenusPallete);
        }
        return menu.active && menuGroupSelected;
      });
      if (activeMenus.length > 0) {
        let newSelectedMenu = this.getMenuById(this.selectedMenusByGroup[this._currentMenusPallete]) || activeMenus[0];
        this.menuClick(newSelectedMenu);
      }
      this.updateAllMenuEyeBehaviors();
      return activeMenus;
    } else {
      return [];
    }
  }

  capitalizeFirstLetter(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}