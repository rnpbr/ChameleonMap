import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-menu-chooser',
  templateUrl: './menu-chooser.component.html',
  styleUrls: ['./menu-chooser.component.css']
})
export class MenuChooserComponent implements AfterViewInit, OnDestroy {
  public _currentMenu: string;
  public tabs: Array<string> = [];
  public _linksFeatureOn: boolean;
  public hasOverflow = false;
  public canScrollLeft = false;
  public canScrollRight = false;

  private _menugroups: Array<MenuGroup>;
  private resizeObserver?: ResizeObserver;
  private overflowCheckPending = false;
  private readonly onWheelListener = (event: WheelEvent) => this.onTabsWheel(event);

  @ViewChild('tabsScroll') tabsScroll?: ElementRef<HTMLElement>;

  constructor(private cdr: ChangeDetectorRef) { }

  @Input()
  get linksFeatureOn(): boolean {
    return this._linksFeatureOn;
  }
  set linksFeatureOn(value: boolean) {
    this._linksFeatureOn = value;
  }

  @Input()
  get menugroups(): Array<MenuGroup> {
    return this._menugroups;
  }

  set menugroups(value: Array<MenuGroup>) {
    if (!value) { return }
    const newTabs = value.reduce((acc: Array<string>, menu) => {
      if (!acc.includes(menu.name)) {
        acc.push(menu.name);
      }
      return acc;
    }, []);
    this._menugroups = value;
    if (newTabs.length > 0) {
      this.tabs = this.tabs.concat(newTabs);
      this.onTabClick(newTabs[0]);
    }
    this.cdr.detectChanges();
    this.scheduleOverflowCheck();
  }

  @Output()
  buttonClicked = new EventEmitter();

  ngAfterViewInit() {
    const el = this.tabsScroll?.nativeElement;
    if (el) {
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.scheduleOverflowCheck());
        this.resizeObserver.observe(el);
      }
      // Non-passive so we can preventDefault and map zoom doesn't steal the wheel.
      el.addEventListener('wheel', this.onWheelListener, { passive: false });
    }
    this.scheduleOverflowCheck();
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.tabsScroll?.nativeElement.removeEventListener('wheel', this.onWheelListener);
  }

  onTabClick(tab: string) {
    this.buttonClicked.emit({ clickedMenu: tab });
    this._currentMenu = tab;
    this.scrollTabIntoView(tab);
  }

  onTabsScroll() {
    this.updateOverflowState();
  }

  scrollTabs(direction: -1 | 1, event?: Event) {
    event?.stopPropagation();
    event?.preventDefault();
    const container = this.tabsScroll?.nativeElement;
    if (!container) { return; }
    const amount = Math.max(container.clientWidth * 0.65, 100);
    container.scrollBy({ left: direction * amount, behavior: 'smooth' });
  }

  private onTabsWheel(event: WheelEvent) {
    const container = this.tabsScroll?.nativeElement;
    if (!container) { return; }

    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll <= 1) { return; }

    // Trackpads may already send deltaX; mice usually send deltaY.
    const delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (delta === 0) { return; }

    event.preventDefault();
    event.stopPropagation();
    container.scrollLeft = Math.min(maxScroll, Math.max(0, container.scrollLeft + delta));
    this.updateOverflowState();
    this.cdr.detectChanges();
  }

  private scheduleOverflowCheck() {
    if (this.overflowCheckPending) { return; }
    this.overflowCheckPending = true;
    requestAnimationFrame(() => {
      this.overflowCheckPending = false;
      this.updateOverflowState();
      this.cdr.detectChanges();
    });
  }

  private updateOverflowState() {
    const container = this.tabsScroll?.nativeElement;
    if (!container) { return; }

    const maxScroll = container.scrollWidth - container.clientWidth;
    this.hasOverflow = maxScroll > 1;
    this.canScrollLeft = container.scrollLeft > 1;
    this.canScrollRight = container.scrollLeft < maxScroll - 1;
  }

  private scrollTabIntoView(tab: string) {
    requestAnimationFrame(() => {
      const container = this.tabsScroll?.nativeElement;
      if (!container) { return; }

      const el = Array.from(container.querySelectorAll('.button')).find(
        (node) => (node as HTMLElement).dataset['tab'] === tab
      ) as HTMLElement | undefined;
      if (!el) { return; }

      const elRect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      if (elRect.left < containerRect.left) {
        container.scrollBy({ left: elRect.left - containerRect.left, behavior: 'smooth' });
      } else if (elRect.right > containerRect.right) {
        container.scrollBy({ left: elRect.right - containerRect.right, behavior: 'smooth' });
      }

      this.scheduleOverflowCheck();
    });
  }
}
