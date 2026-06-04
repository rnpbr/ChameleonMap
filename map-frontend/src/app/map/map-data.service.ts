import { Injectable } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import { ApiService } from '../api.service';
import { buildEntityIndex } from './map-behavior';
import { PopupContentService } from './popup-content.service';

export interface MapDataStore {
  bundle: MapDataBundle;
  menuGroups: MenuGroup[];
  menus: Menu[];
  locations: Location[];
  tags: Tag[];
  links: Link[];
  linksGroups: LinksGroup[];
  kmlLayers: KmlLayerDto[];
  settings: MapSettingsDto | null;
  locationsById: Map<number, Location>;
  tagsById: Map<number, Tag>;
  menusById: Map<number, Menu>;
  menuGroupsById: Map<number, MenuGroup>;
  linksGroupsById: Map<number, LinksGroup>;
}

@Injectable()
export class MapDataService {
  private store: MapDataStore | null = null;

  constructor(
    private api: ApiService,
    private popupContent: PopupContentService
  ) {}

  load(): Observable<MapDataStore> {
    return this.api.getMapData().pipe(
      map((bundle) => this.hydrate(bundle)),
      tap((store) => {
        this.store = store;
      })
    );
  }

  getStore(): MapDataStore | null {
    return this.store;
  }

  private hydrate(bundle: MapDataBundle): MapDataStore {
    const menus = bundle.menus.map((menu) => ({
      ...menu,
      expanded: bundle.menus.length < 3,
    }));

    const tags = bundle.tags.map((tag) => ({
      ...tag,
      currentColor: tag.color,
      onMap: true,
      dependenciesActive: true,
      visibility: true,
      child_tags: tag.child_tags ?? [],
      parent_tags: tag.parent_tags ?? [],
    }));

    const locations = bundle.locations.map((location) => {
      const popupDto = bundle.location_popups[String(location.id)];
      return {
        ...location,
        onMap: false,
        activeColors: [],
        locationMarker: {},
        popup: this.popupContent.buildLocationPopup(location.id, popupDto),
      };
    });

    const linksGroups = bundle.links_groups.map((group) => ({
      ...group,
      visibility: false,
    }));

    const kmlLayers = bundle.kml_layers.map((layer) => ({
      ...layer,
      visibility: true,
      currentColor: layer.links_color,
    }));

    const links = bundle.links.map((link) => ({
      ...link,
      line: null,
    }));

    const store: MapDataStore = {
      bundle,
      menuGroups: bundle.menu_groups,
      menus,
      locations,
      tags,
      links,
      linksGroups,
      kmlLayers,
      settings: bundle.settings,
      locationsById: buildEntityIndex(locations),
      tagsById: buildEntityIndex(tags),
      menusById: buildEntityIndex(menus),
      menuGroupsById: buildEntityIndex(bundle.menu_groups),
      linksGroupsById: buildEntityIndex(linksGroups),
    };

    return store;
  }
}
