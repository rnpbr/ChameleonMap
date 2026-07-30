import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
} from '@angular/core';
import { EventEmitterService } from '../event-emitter.service';
import { TagSidebarComponent } from './tag-sidebar/tag-sidebar.component';

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
  @ViewChild(TagSidebarComponent) tagSidebar: TagSidebarComponent;

  public _menugroups: Array<MenuGroup>;
  private _menus: Array<Menu>;
  private _tags: Array<Tag>;
  private _kmlShapes: Array<KmlShape>;
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
  public _linksActive: boolean;

  public activeMenus: Array<Menu>

  @Input()
  get menugroups() {
    return this._menugroups;
  }
  set menugroups(value) {
    this._menugroups = value;
    if (this._menus && this._menus.length > 0) {
      this.activeMenus = this.getActiveMenus();
    }
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

  constructor(private eventEmitterService: EventEmitterService) { }

  ngOnInit() {
    if (this.eventEmitterService.subsVar == undefined) {
      this.eventEmitterService.subsVar =
        this.eventEmitterService.invokeFirstComponentFunction.subscribe(
          (name: string) => {
            this.menuCollapse();
          }
        );
    }
    var isChrome = navigator.userAgent.includes('Chrome');
    if (isChrome == true){
      const menufilter = document.querySelectorAll<HTMLElement>('.scrollbar-box');
      for (let i = 0, len = menufilter.length; i < len; i++) {
          menufilter[i].setAttribute('style', 'scrollbar-width: thin');
        }
    }
  }

  LGVisibilityClick(lg: any, event: any) {
    if (lg.visibility) {
      lg.visibility = false;
      console.log(`${lg.name} visiblity is now ${lg.visibility}`)
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
      this.checkActiveMenuTagsVisibilityStatus(menu.id)
    }
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
        if (shape.visibility == true) {
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
          this.visibilityClick(this._tags[i], event)
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
  
  onMenuPinClicked(menu: Menu, event: any) {
    this.toggleMenuPin(menu, event);
    this.specialMenuPinRules(menu, event);
  }

  private toggleMenuPin(menu: Menu, event: any) {
    menu.pinned ? this.unpinMenuButtonClicked(menu, event): this.pinMenuButtonClicked(menu, event);
  }

  private specialMenuPinRules(selectedMenu: Menu, event: any) {
    if (selectedMenu.name.includes("Ipê")) {
      this._menus.forEach((menu) => {
        if (menu.name.includes("Ipê") && selectedMenu.id != menu.id) {
          this.toggleMenuPin(menu, event);
          return;
        }
      })
    }
    else if (selectedMenu.name.includes("CNDs")) {
      this._menus.forEach((menu) => {
        if (menu.name.includes("CNDs") && selectedMenu.id != menu.id) {
          this.toggleMenuPin(menu, event);
          return;
        }
      })
    } 

  }

  pinMenuButtonClicked(menu: Menu, event: any) {
    this.pinMenu(menu)
    this.tagSidebar.addPinnedMenu(menu)
    this.menuCliked.emit({ selectedTagsMenuId: this.selectedTagsMenuId });
    event.stopPropagation();
  }

  unpinMenuButtonClicked(menu: Menu, event: any) {
    this.unpinMenu(menu);
    this.tagSidebar.removePinnedMenu(menu);
    this.menuCliked.emit({ selectedTagsMenuId: this.selectedTagsMenuId });
    event.stopPropagation();
  }

  pinMenu(menu: Menu){
    menu.pinned = true;
  }

  unpinMenu(menu: Menu){
    menu.pinned = false;
  }

  sideBarUnpinMenuButtonClicked(menu: Menu){
    this.unpinMenuButtonClicked(menu, menu);
  }

  menuCollapse() {
    this.isCollapsed = !this.isCollapsed;
    const menufilter = document.querySelectorAll<HTMLElement>('.scrollbar-box');
    var isChrome = navigator.userAgent.includes('Chrome');
    for (let i = 0, len = menufilter.length; i < len; i++) {
      if (this.isCollapsed) {
        menufilter[i].setAttribute('style', 'left: -312px;');
      } else {
        if (isChrome == true){
          menufilter[i].setAttribute('style', 'left: 15px; scrollbar-width: thin;');
        } else{
          menufilter[i].setAttribute('style', 'left: 15px;');
        }
      }
    }
  }

  visibilityClick(tag: any, event: any) {
    // Added in need for the sidebar button not to open
    event.stopPropagation();

    if (tag.parent_menu !== this.selectedTagsMenuId) {
      const beforeState = this.selectedTagsMenuId;
      this.selectedTagsMenuId = tag.parent_menu;
      this.menuCliked.emit({ selectedTagsMenuId: this.selectedTagsMenuId });
      this.switchVisibility(tag);
      this.selectedTagsMenuId = beforeState;
      this.menuCliked.emit({ selectedTagsMenuId: this.selectedTagsMenuId });
    } else this.switchVisibility(tag);

    this.checkActiveMenuTagsVisibilityStatus(tag.parent_menu)
  }

  kmlVisibilityClick(kmlShape: any, event: any) {
    // Added in need for the sidebar button not to open
    event.stopPropagation();

    kmlShape.visibility = !kmlShape.visibility;

    if (kmlShape.parent_menu === this.selectedTagsMenuId) {
      if (kmlShape.visibility)
        this.insertKmlShape(kmlShape)
      else
        this.removeKmlShape(kmlShape)
    }

    this.checkActiveMenuTagsVisibilityStatus(kmlShape.parent_menu)
  }

  pinClick(tag: any, event: any) {
    // Added in need for the sidebar button not to open
    event.stopPropagation();

    if (tag.currentColor === tag.color) {
      tag.currentColor = '#AFBAC4';
    } else {
      tag.currentColor = tag.color;
    }
    this.menuCliked.emit({ selectedTagsMenuId: this.selectedTagsMenuId });
  }

  getLocationById(location_id: number) {
    for (const location of this._locations) {
      if (location.id === location_id) {
        return location;
      }
    }
    return null;
  }

  getMenuById(id: number) {
    for (const menu of this._menus) {
      if (menu.id === id) {
        return menu;
      }
    }
    return null;
  }

  invokeTagSidebar(tag: Tag) {
    const _selectedLocations = Array<Location>();
    tag.related_locations.forEach((location_id: number) => {
      const location: any = this.getLocationById(location_id);
      _selectedLocations.push(location);
    });
    this.tagSidebar.selectTag(tag, _selectedLocations);
  }

  checkActiveMenuTagsVisibilityStatus(menuId: number) {
    if (!this._tags && !this._kmlShapes && !this._linkGroups) { return }

    let allItemsAreClosed: Boolean = true;

    this._tags?.forEach(tag => {
      if (tag.parent_menu === menuId) {
        if (tag.visibility)
          allItemsAreClosed = false;
      }
    });

    this._kmlShapes?.forEach(shape => {
      if (shape.parent_menu === menuId) {
        if (shape.visibility || shape.visibility == undefined)
          allItemsAreClosed = false;
      }
    });

    this._linkGroups?.forEach(linkGroup => {
      if (linkGroup.parent_menu === menuId) {
        console.log(`${linkGroup.name} visibility is ${linkGroup.visibility}`)
        if (linkGroup.visibility)
          allItemsAreClosed = false;
      }
    });

    const menu = this.getMenuById(menuId);
    if (menu) {
      if (allItemsAreClosed)
        menu.isEyeVisibilityOpen = false;
      else
        menu.isEyeVisibilityOpen = true;
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

  removeKmlShape(kmlShape: KmlShape) {
    this.shapeRemoval.emit({ shape: kmlShape });
  }

  insertKmlShape(kmlShape: KmlShape) {
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

  updateAllMenuEyeBehaviors() {
    if (this.activeMenus) {
      this.activeMenus.forEach(menu => {
        this.checkActiveMenuTagsVisibilityStatus(menu.id);
      });
    }
  }

  capitalizeFirstLetter(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
