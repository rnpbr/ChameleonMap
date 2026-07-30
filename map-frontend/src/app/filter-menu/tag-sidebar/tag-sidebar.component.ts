import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  AfterViewInit
} from '@angular/core';
import { MatOptgroup } from '@angular/material/core';
import { EventEmitterService } from '../../event-emitter.service';

@Component({
  selector: 'app-tag-sidebar',
  templateUrl: './tag-sidebar.component.html',
  styleUrls: ['./tag-sidebar.component.css']
})
export class TagSidebarComponent {
  public _tags: Array<Tag>;
  public _locations: Array<Location>;
  public _selectedLocations: Array<Location>;
  public _selectedTagId: number;
  public _selectedTag: Tag;
  public _sbContent: string;
  public _hasSbContent: boolean;
  public _collapsed = true;
  public _pinnedMenusCollapsed = false;
  public _pinnedMenus: Array<Menu>;

  constructor() {
    this._pinnedMenus = [];
  }

  @Input() capitalizeFirstLetter: (str: string) => void;
  @Output() unpinMenuEmitter = new EventEmitter<Menu>(); 
  @Output() selectMenuEmitter = new EventEmitter<Menu>(); 

  pinnedMenusHeaderClicked() {
    if (this._pinnedMenusCollapsed) this.showPinnedMenus();
    else this.collapsePinnedMenus();
  }

  showPinnedMenus() {
    this._pinnedMenusCollapsed = false;
  }

  collapsePinnedMenus() {
    this._pinnedMenusCollapsed = true;
  }

  collapse() {
    this._collapsed = true;
    const sidebar = document.querySelectorAll<HTMLElement>('.right-sidebar');
    sidebar[0].setAttribute('style', 'right: -320px;');
    const outer = document.querySelectorAll<HTMLElement>('.right-sidebar-container');
    outer[0].classList.add('collapsed');
    //outer[0].setAttribute('style', 'box-shadow: none');
  }

  show() {
    this._collapsed = false;
    const sidebar = document.querySelectorAll<HTMLElement>('.right-sidebar');
    sidebar[0].setAttribute('style', 'right: 0px;');
    const outer = document.querySelectorAll<HTMLElement>('.right-sidebar-container');
    outer[0].classList.remove('collapsed');
    //outer[0].setAttribute('style', 'box-shadow: 0px 3px 1px -2px rgba(0, 0, 0, 0.2), 0px 2px 2px 0px rgba(0, 0, 0, 0.14), 0px 1px 5px 0px rgba(0, 0, 0, 0.12);');
  }

  public selectTag(tag: Tag, related_locations: Array<Location>) {
    if (tag != this._selectedTag || this._selectedTag == undefined) {
      this._selectedTag = tag;
      this._selectedLocations = related_locations;
      /*Indicating whether the tag has sidebar content to show*/
      this._hasSbContent = !(
        this._selectedTag.sidebar_content == null ||
        this._selectedTag.sidebar_content == '' ||
        this._selectedTag.sidebar_content == 'null' ||
        this._selectedTag.sidebar_content == '<p>null</p>' ||
        this._selectedTag.sidebar_content == '<p></p>'
      );
      this.collapsePinnedMenus();
      this.show();
    } else if (this._collapsed) {
      /* Collapsing the menu whenever it receives the same tag or its collapsed */
      this.show();
    } else {
      this.collapse();
    }
  }

  public addPinnedMenu(menu: Menu){
    this._pinnedMenus.push(menu)
  }

  public removePinnedMenu(menu: Menu){
    const index = this._pinnedMenus.indexOf(menu)
    this._pinnedMenus.splice(index, 1)
  }

  public unpinClickedMenu(menu: Menu) {
    this.removePinnedMenu(menu)
    this.unpinMenuEmitter.emit(menu)
  }
  

  unpinAllPinnedMenus() {
    this._pinnedMenus.forEach( menu =>
      this.unpinClickedMenu(menu)
    )
    this._pinnedMenus = [];
  }

  public openPinnedMenu(menu: Menu) {
  }
}
