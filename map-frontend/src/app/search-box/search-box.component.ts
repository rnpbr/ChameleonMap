import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild
} from '@angular/core';

import { SearchKind } from '../search/map-search';
import { SearchSuggestion } from '../search/map-search.service';

interface KindFilterOption {
  readonly kind: SearchKind;
  readonly count: number;
  readonly selected: boolean;
}

const FILTER_KINDS: SearchKind[] = ['menu', 'tag', 'linksGroup', 'kml', 'location'];
const RENDER_PAGE_SIZE = 100;
const LOAD_MORE_THRESHOLD_PX = 200;

@Component({
  selector: 'app-search-box',
  templateUrl: './search-box.component.html',
  styleUrls: ['./search-box.component.css']
})
export class SearchBoxComponent {
  private static nextId = 0;

  @Input() set value(val: string) {
    this.searchText = val || '';
  }

  @Input()
  get suggestions(): SearchSuggestion[] {
    return this._suggestions;
  }
  set suggestions(value: SearchSuggestion[]) {
    this._suggestions = value ?? [];
    this.refresh();
  }

  @Input()
  get kinds(): SearchKind[] {
    return this._kinds;
  }
  set kinds(value: SearchKind[]) {
    this._kinds = value ?? [];
    this.refresh();
  }

  @Output() valueChange = new EventEmitter<string>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<string>();
  @Output() suggestionSelected = new EventEmitter<SearchSuggestion>();
  @Output() kindsChange = new EventEmitter<SearchKind[]>();

  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('suggestionList') suggestionListRef?: ElementRef<HTMLElement>;

  searchText: string = '';
  activeIndex = -1;
  isOpen = false;
  filterOptions: KindFilterOption[] = [];
  visibleSuggestions: SearchSuggestion[] = [];
  renderedSuggestions: SearchSuggestion[] = [];
  readonly listboxId = `search-suggestions-${SearchBoxComponent.nextId++}`;
  private _suggestions: SearchSuggestion[] = [];
  private _kinds: SearchKind[] = [];

  constructor(private host: ElementRef<HTMLElement>) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!event.composedPath().includes(this.host.nativeElement)) {
      this.close();
    }
  }

  onInputChange(value: string): void {
    this.searchText = value;
    this.isOpen = value.trim().length > 0;
    this.valueChange.emit(this.searchText);
    this.searchChange.emit(this.searchText);
  }

  onFocus(): void {
    this.isOpen = this.searchText.trim().length > 0;
  }

  onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        this.moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
        break;
      case 'Enter':
        event.preventDefault();
        this.onSubmit();
        break;
      case 'Escape':
        this.close();
        break;
    }
  }

  onSubmit(): void {
    const highlighted = this.isOpen ? this.visibleSuggestions[this.activeIndex] : undefined;
    if (highlighted) {
      this.select(highlighted);
      return;
    }

    const query = this.searchText.trim();
    if (!query) return;
    if (this.visibleSuggestions.length === 0) {
      this.isOpen = true;
      return;
    }

    this.close();
    this.search.emit(query);
  }

  select(suggestion: SearchSuggestion): void {
    this.close();
    this.suggestionSelected.emit(suggestion);
  }

  clear(): void {
    this.searchText = '';
    this.close();
    this.valueChange.emit('');
    this.searchChange.emit('');
    this.searchInputRef?.nativeElement.focus();
  }

  showAllKinds(): void {
    this.setKinds([]);
  }

  toggleKind(kind: SearchKind): void {
    this.setKinds(
      this._kinds.includes(kind) ? this._kinds.filter((k) => k !== kind) : [...this._kinds, kind]
    );
  }

  onListScroll(): void {
    const list = this.suggestionListRef?.nativeElement;
    if (!list || this.renderedSuggestions.length >= this.visibleSuggestions.length) return;
    if (list.scrollTop + list.clientHeight >= list.scrollHeight - LOAD_MORE_THRESHOLD_PX) {
      this.render(this.renderedSuggestions.length + RENDER_PAGE_SIZE);
    }
  }

  isGroupStart(index: number): boolean {
    return (
      index === 0 || this.visibleSuggestions[index - 1].kind !== this.visibleSuggestions[index].kind
    );
  }

  optionId(index: number): string {
    return `${this.listboxId}-${index}`;
  }

  trackByKind(_: number, option: KindFilterOption): SearchKind {
    return option.kind;
  }

  trackBySuggestion(_: number, suggestion: SearchSuggestion): string {
    return `${suggestion.kind}:${suggestion.id}`;
  }

  private setKinds(kinds: SearchKind[]): void {
    this._kinds = kinds;
    this.kindsChange.emit(kinds);
    this.refresh();
  }

  private refresh(): void {
    const counts = new Map<SearchKind, number>();
    this._suggestions.forEach((suggestion) =>
      counts.set(suggestion.kind, (counts.get(suggestion.kind) ?? 0) + 1)
    );
    this.filterOptions = FILTER_KINDS.filter(
      (kind) => counts.has(kind) || this._kinds.includes(kind)
    ).map((kind) => ({ kind, count: counts.get(kind) ?? 0, selected: this._kinds.includes(kind) }));

    this.visibleSuggestions =
      this._kinds.length > 0
        ? this._suggestions.filter((suggestion) => this._kinds.includes(suggestion.kind))
        : this._suggestions;
    this.activeIndex = -1;
    this.render(RENDER_PAGE_SIZE);

    const list = this.suggestionListRef?.nativeElement;
    if (list) list.scrollTop = 0;
  }

  private render(limit: number): void {
    this.renderedSuggestions = this.visibleSuggestions.slice(0, limit);
  }

  private close(): void {
    this.isOpen = false;
    this.activeIndex = -1;
    this.render(RENDER_PAGE_SIZE);
  }

  private moveHighlight(step: number): void {
    if (this.visibleSuggestions.length === 0) return;

    const positions = this.visibleSuggestions.length + 1;
    this.isOpen = true;
    this.activeIndex = ((this.activeIndex + 1 + step + positions) % positions) - 1;
    if (this.activeIndex >= this.renderedSuggestions.length) {
      this.render(this.activeIndex + RENDER_PAGE_SIZE);
    }
    setTimeout(() =>
      this.host.nativeElement.querySelector('.suggestion.active')?.scrollIntoView({ block: 'nearest' })
    );
  }
}
