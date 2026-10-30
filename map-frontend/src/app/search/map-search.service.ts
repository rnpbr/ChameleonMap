import { Injectable } from '@angular/core';

import { LanguageService } from '../language.service';
import { MapDataService, MapDataStore } from '../map/map-data.service';
import {
  buildSearchIndex,
  NameTranslationLike,
  pickBestSelection,
  SearchHit,
  SearchIndex,
  searchIndex,
  SearchKind,
  SearchSelection
} from './map-search';

export interface SearchSuggestion {
  readonly kind: SearchKind;
  readonly id: number;
  readonly label: string;
  readonly context: string;
  readonly color: string | null;
}

const MAX_SUGGESTIONS = 10;
const MAX_SUGGESTIONS_PER_KIND = 3;
const CANDIDATE_HITS = 50;

@Injectable()
export class MapSearchService {
  private indexedStore: MapDataStore | null = null;
  private index: SearchIndex | null = null;

  constructor(
    private mapData: MapDataService,
    private languageService: LanguageService
  ) {}

  suggest(query: string): SearchSuggestion[] {
    const index = this.ensureIndex();
    if (!index || !query.trim()) return [];

    const countByKind = new Map<SearchKind, number>();
    const hits = searchIndex(index, query, CANDIDATE_HITS)
      .filter((hit) => {
        const count = countByKind.get(hit.kind) ?? 0;
        countByKind.set(hit.kind, count + 1);
        return count < MAX_SUGGESTIONS_PER_KIND;
      })
      .slice(0, MAX_SUGGESTIONS);

    const grouped: SearchHit[] = [];
    new Set(hits.map((hit) => hit.kind)).forEach((kind) =>
      grouped.push(...hits.filter((hit) => hit.kind === kind))
    );
    return grouped
      .map((hit) => this.toSuggestion(hit.kind, hit.id))
      .filter((suggestion): suggestion is SearchSuggestion => suggestion !== null);
  }

  bestSelection(query: string): SearchSelection {
    const index = this.ensureIndex();
    if (!index) return { type: 'none' };
    return pickBestSelection(searchIndex(index, query, CANDIDATE_HITS));
  }

  private ensureIndex(): SearchIndex | null {
    const store = this.mapData.getStore();
    if (!store) return null;

    if (store !== this.indexedStore) {
      this.indexedStore = store;
      this.index = buildSearchIndex({
        menuGroups: store.menuGroups,
        menus: store.menus,
        tags: store.tags,
        linksGroups: store.settings?.link_feature ? store.linksGroups : [],
        kmlLayers: store.kmlLayers,
        locations: store.locations
      });
    }
    return this.index;
  }

  private toSuggestion(kind: SearchKind, id: number): SearchSuggestion | null {
    const store = this.indexedStore;
    if (!store) return null;

    switch (kind) {
      case 'menu': {
        const menu = store.menusById.get(id);
        if (!menu) return null;
        const group = store.menuGroupsById.get(menu.group);
        return { kind, id, label: this.translate(menu), context: this.translate(group), color: null };
      }
      case 'tag': {
        const tag = store.tagsById.get(id);
        if (!tag) return null;
        return { kind, id, label: this.translate(tag), context: this.menuLabel(tag.parent_menu), color: tag.color };
      }
      case 'linksGroup': {
        const linksGroup = store.linksGroupsById.get(id);
        if (!linksGroup) return null;
        return {
          kind,
          id,
          label: this.translate(linksGroup),
          context: this.menuLabel(linksGroup.parent_menu),
          color: linksGroup.links_color
        };
      }
      case 'kml': {
        const kml = store.kmlLayers.find((layer) => layer.id === id);
        if (!kml) return null;
        return { kind, id, label: this.translate(kml), context: this.menuLabel(kml.parent_menu), color: kml.links_color };
      }
      case 'location': {
        const location = store.locationsById.get(id);
        if (!location) return null;
        const tags = (this.index?.tagIdsByLocation.get(id) ?? [])
          .map((tagId) => store.tagsById.get(tagId))
          .filter((tag): tag is Tag => tag !== undefined);
        return {
          kind,
          id,
          label: this.translate(location),
          context: tags.slice(0, 2).map((tag) => this.translate(tag)).join(', '),
          color: tags[0]?.color ?? null
        };
      }
    }
  }

  private menuLabel(menuId: number): string {
    return this.translate(this.indexedStore?.menusById.get(menuId));
  }

  private translate(entity: { name: string; translations?: NameTranslationLike[] } | undefined): string {
    if (!entity) return '';
    const language = this.languageService.language;
    return entity.translations?.find((translation) => translation.language_code === language)?.name ?? entity.name;
  }
}
