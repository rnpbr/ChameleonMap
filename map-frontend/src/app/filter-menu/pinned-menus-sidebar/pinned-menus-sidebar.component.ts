import {
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';

@Component({
  selector: 'app-pinned-menus-sidebar',
  templateUrl: './pinned-menus-sidebar.component.html',
  styleUrls: ['./pinned-menus-sidebar.component.css']
})
export class PinnedMenusSidebarComponent {
  public _pinnedMenusCollapsed = false;
  public _pinnedMenus: Array<Menu> = [];

  @Input() capitalizeFirstLetter: (str: string) => string;
  @Output() unpinMenuEmitter = new EventEmitter<Menu>();
  @Output() selectMenuEmitter = new EventEmitter<Menu>();

  pinnedMenusHeaderClicked() {
    if (this._pinnedMenusCollapsed) {
      this.showPinnedMenus();
    } else {
      this.collapsePinnedMenus();
    }
  }

  showPinnedMenus() {
    this._pinnedMenusCollapsed = false;
  }

  collapsePinnedMenus() {
    this._pinnedMenusCollapsed = true;
  }

  public addPinnedMenu(menu: Menu) {
    if (!this._pinnedMenus.includes(menu)) {
      this._pinnedMenus.push(menu);
    }
  }

  public removePinnedMenu(menu: Menu) {
    const index = this._pinnedMenus.indexOf(menu);
    if (index >= 0) {
      this._pinnedMenus.splice(index, 1);
    }
  }

  public unpinClickedMenu(menu: Menu, event: Event) {
    event.stopPropagation();
    this.removePinnedMenu(menu);
    this.unpinMenuEmitter.emit(menu);
  }

  unpinAllPinnedMenus() {
    [...this._pinnedMenus].forEach(menu => {
      this.removePinnedMenu(menu);
      this.unpinMenuEmitter.emit(menu);
    });
    this._pinnedMenus = [];
  }

  public openPinnedMenu(menu: Menu) {
    this.selectMenuEmitter.emit(menu);
  }
}
