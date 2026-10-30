import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild
} from '@angular/core';

import { SearchSuggestion } from '../search/map-search.service';

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
    this.activeIndex = -1;
  }

  @Output() valueChange = new EventEmitter<string>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<string>();
  @Output() suggestionSelected = new EventEmitter<SearchSuggestion>();

  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  searchText: string = '';
  activeIndex = -1;
  isOpen = false;
  readonly listboxId = `search-suggestions-${SearchBoxComponent.nextId++}`;
  private _suggestions: SearchSuggestion[] = [];

  constructor(private host: ElementRef<HTMLElement>) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
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
    const highlighted = this.isOpen ? this.suggestions[this.activeIndex] : undefined;
    if (highlighted) {
      this.select(highlighted);
      return;
    }

    const query = this.searchText.trim();
    if (!query) return;
    if (this.suggestions.length === 0) {
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

  isGroupStart(index: number): boolean {
    return index === 0 || this.suggestions[index - 1].kind !== this.suggestions[index].kind;
  }

  optionId(index: number): string {
    return `${this.listboxId}-${index}`;
  }

  private close(): void {
    this.isOpen = false;
    this.activeIndex = -1;
  }

  private moveHighlight(step: number): void {
    if (this.suggestions.length === 0) return;

    const positions = this.suggestions.length + 1;
    this.isOpen = true;
    this.activeIndex = ((this.activeIndex + 1 + step + positions) % positions) - 1;
    setTimeout(() =>
      this.host.nativeElement.querySelector('.suggestion.active')?.scrollIntoView({ block: 'nearest' })
    );
  }
}
