import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  Output,
  ViewChild,
  effect,
} from '@angular/core';
import { LanguageService } from '../language.service';

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
  private scrollEdgesPending = false;
  private textMeasureContext: CanvasRenderingContext2D | null = null;
  private readonly onWheelListener = (event: WheelEvent) => this.onTabsWheel(event);
  private readonly onScrollListener = () => this.scheduleScrollEdgesUpdate();

  @ViewChild('tabsScroll') tabsScroll?: ElementRef<HTMLElement>;

  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private languageService: LanguageService,
  ) {
    effect(() => {
      this.languageService.language;
      this.scheduleOverflowCheck();
    });
  }

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
      this.zone.runOutsideAngular(() => {
        el.addEventListener('wheel', this.onWheelListener, { passive: false });
        el.addEventListener('scroll', this.onScrollListener, { passive: true });
      });
    }
    this.scheduleOverflowCheck();
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    const el = this.tabsScroll?.nativeElement;
    if (el) {
      el.removeEventListener('wheel', this.onWheelListener);
      el.removeEventListener('scroll', this.onScrollListener);
    }
  }

  getMenuGroupByName(name: string): MenuGroup | { name: string } {
    return this._menugroups?.find((group) => group.name === name) ?? { name };
  }

  onTabClick(tab: string) {
    this.buttonClicked.emit({ clickedMenu: tab });
    this._currentMenu = tab;
    this.scrollTabIntoView(tab);
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
    if (!container || !this.hasOverflow) { return; }

    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll <= 1) { return; }

    let delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (delta === 0) { return; }

    // Normalize line/page deltas to pixels.
    if (event.deltaMode === 1) {
      delta *= 16;
    } else if (event.deltaMode === 2) {
      delta *= container.clientWidth;
    }

    event.preventDefault();
    event.stopPropagation();
    container.scrollLeft += delta;
    this.scheduleScrollEdgesUpdate();
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

  private scheduleScrollEdgesUpdate() {
    if (this.scrollEdgesPending) { return; }
    this.scrollEdgesPending = true;
    requestAnimationFrame(() => {
      this.scrollEdgesPending = false;
      this.updateScrollEdges();
    });
  }

  /** Fast path: only toggle chevron enabled state from current scrollLeft. */
  private updateScrollEdges() {
    const container = this.tabsScroll?.nativeElement;
    if (!container || !this.hasOverflow) { return; }

    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
    const canLeft = container.scrollLeft > 1;
    const canRight = container.scrollLeft < maxScroll - 1;

    if (canLeft !== this.canScrollLeft || canRight !== this.canScrollRight) {
      this.canScrollLeft = canLeft;
      this.canScrollRight = canRight;
      this.zone.run(() => this.cdr.detectChanges());
    }
  }

  private updateOverflowState() {
    const container = this.tabsScroll?.nativeElement;
    if (!container) { return; }

    // Decide overflow from capped preferred widths, not the current flex layout.
    // Otherwise expand-to-fill can shrink tabs and hide real overflow.
    const buttons = Array.from(container.querySelectorAll('.button')) as HTMLElement[];
    const gap = parseFloat(getComputedStyle(container).gap || '0') || 0;
    let preferredTotal = Math.max(0, buttons.length - 1) * gap;
    for (const btn of buttons) {
      preferredTotal += this.measureCappedTabWidth(btn);
    }

    const previousOverflow = this.hasOverflow;
    this.hasOverflow = preferredTotal > container.clientWidth + 1;

    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
    this.canScrollLeft = this.hasOverflow && container.scrollLeft > 1;
    this.canScrollRight = this.hasOverflow && container.scrollLeft < maxScroll - 1;

    if (previousOverflow !== this.hasOverflow) {
      this.scheduleOverflowCheck();
    }
  }

  /** Preferred tab width as used in scroll mode (content, capped at max-width). */
  private measureCappedTabWidth(btn: HTMLElement): number {
    const tabMaxWidth = 104;
    const label = btn.querySelector('.button-label') as HTMLElement | null;
    const btnStyle = getComputedStyle(btn);
    const pad =
      (parseFloat(btnStyle.paddingLeft) || 0) +
      (parseFloat(btnStyle.paddingRight) || 0);

    let contentWidth = 0;
    if (label?.textContent) {
      const labelStyle = getComputedStyle(label);
      contentWidth = this.measureTextWidth(label.textContent, labelStyle);
    }

    return Math.min(tabMaxWidth, Math.ceil(contentWidth + pad));
  }

  private measureTextWidth(text: string, style: CSSStyleDeclaration): number {
    if (!this.textMeasureContext) {
      const canvas = document.createElement('canvas');
      this.textMeasureContext = canvas.getContext('2d');
    }
    const context = this.textMeasureContext;
    if (!context) { return text.length * 8; }
    context.font = [
      style.fontStyle,
      style.fontVariant,
      style.fontWeight,
      style.fontSize,
      style.fontFamily,
    ].join(' ');
    return context.measureText(text).width;
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
