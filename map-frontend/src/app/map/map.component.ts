import {
  Component,
  OnInit,
  Input,
  AfterViewInit,
  AfterViewChecked,
  EventEmitter,
  ViewChild,
  HostListener
} from '@angular/core';

import * as L from 'leaflet';
import 'leaflet-responsive-popup';
import '@elfalem/leaflet-curve';
import { OverlayedPopupComponent } from '../overlayed-popup/overlayed-popup.component';
import { TooltipComponent } from '../tooltip/tooltip.component';
import { ChameleonButtonComponent } from '../chameleon-button/chameleon-button.component';
import { createMapLoadProfiler, MapLoadProfiler } from './map-load-profiler';
import { MapDataService, MapDataStore } from './map-data.service';
import { PopupContentService } from './popup-content.service';
import { runBatchedWork, BatchSchedulerHandle } from './map-interaction-scheduler';
import {
  buildEntityIndex,
  isAnyClusterActive,
  isLinkEligible,
  isMenuSimultaneousAndSelected,
  shouldShowTagForMenu
} from './map-behavior';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  @ViewChild(OverlayedPopupComponent) overlayedPopup: OverlayedPopupComponent;
  @ViewChild(TooltipComponent) onboardingComponent: TooltipComponent;

  private _locations: Array<Location>;
  public _menugroups: Array<MenuGroup>;
  private _menus: Array<Menu>;
  private _tags: Array<Tag>;
  private _tagRelationships: Array<TagRelationship>;
  private _mapSettings: any;
  private _links: Array<Link>;
  private _linksGroup: Array<LinksGroup>;
  private _kmlShapes: Array<KmlLayerDto>;
  public mapSetting: any = null;
  public map: L.Map;
  private mapLoaded = false;
  private mapInitialized = false;
  private markerClusterGroup: L.MarkerClusterGroup;
  public currentMenuGroup: string;
  private error: any;
  public selectedMenusByGroup: { [key: string]: number } = {};
  private _selectedMenu: number;
  public get selectedMenu(): number {
    return this._selectedMenu;
  }
  public set selectedMenu(value: number) {
    this._selectedMenu = value;
    this.selectedMenusByGroup[this.currentMenuGroup] = value;
  }
  public defaultMenuId: number;

  public footerUrl = ""

  public linksFeatureOn = false;
  showRotateMessage = false;
  
  get hasMenuGroupTabs() {
    if (!this._menugroups) return false;
    const tabsLength = this._menugroups.length;
    if (tabsLength == 1) {
      return !this.mapSetting.hide_menu_group_when_unique;
    }
    return tabsLength > 1;
  }

  private kmlLayers: { [key: number]: L.Layer } = {};
  private readonly loadProfiler: MapLoadProfiler = createMapLoadProfiler();

  mapInteractionPhase: 'loading' | 'static' | 'enriching' | 'ready' = 'loading';
  private deferClusterTooltips = true;
  private clusterHoverAttached = false;
  private markerClusterOnMap = false;
  private isInitialStaticLoad = true;
  private enrichGeneration = 0;
  private enrichSchedulerHandle: BatchSchedulerHandle | null = null;
  private pendingKmlTooltipAttaches: Array<() => void> = [];

  private static readonly MARKER_INTERACTION_CHUNK = 200;
  private static readonly LINK_INTERACTION_CHUNK = 100;

  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    if (event.target.classList.contains("opp-open-button")) {
      this.overlayedPopup.activate(event.target);
    }
  }

  @HostListener('window:orientationchange')
  onOrientationChange() {
    this.checkOrientation();
  }

  get locations() {
    return this._locations;
  }
  set locations(value) {
    this._locations = value;
  }

  get menugroups() {
    return this._menugroups;
  }
  set menugroups(value) {
    this._menugroups = value;
    if (this._menugroups.length > 0) {
      this.currentMenuGroup = this._menugroups[0].name;
    }
  }

  get menus() {
    return this._menus;
  }
  set menus(value) {
    this._menus = value;
  }

  get tags() {
    return this._tags;
  }
  set tags(value) {
    this._tags = value;
  }

  get tagRelationships() {
    return this._tagRelationships;
  }
  set tagRelationships(value) {
    this._tagRelationships = value;
  }

  get mapSettings() {
    return this._mapSettings;
  }
  set mapSettings(value) {
    this._mapSettings = value;
    if (value === undefined || value === null) {
      this.mapSetting = null;
      return;
    }
    this.mapSetting = Array.isArray(value) ? value[0] : value;
  }

  get links() {
    return this._links;
  }
  set links(value) {
    this._links = value;
  }

  get linksGroup() {
    return this._linksGroup;
  }
  set linksGroup(value) {
    this._linksGroup = value;
  }

  get kmlShapes() {
    return this._kmlShapes;
  }
  set kmlShapes(value) {
    this._kmlShapes = value;
  }

  constructor(
    private mapDataService: MapDataService,
    private popupContent: PopupContentService
  ) {
    this.checkOrientation();
  }

  ngOnInit() {
    this.loadProfiler.mark('map.load.total.start');
    this.loadProfiler.mark('map.load.mapData.start');
    this.mapDataService.load().subscribe({
      next: (store) => {
        this.loadProfiler.endMark('map.load.mapData.end');
        this.loadProfiler.measure('map.load.mapData', 'map.load.mapData.start', 'map.load.mapData.end');
        this.hydrateFromStore(store);
        this.initializeMap();
      },
      error: (error) => {
        this.error = error;
        console.error('Error loading map data:', error);
      }
    });
  }

  private hydrateFromStore(store: MapDataStore) {
    this.menugroups = [...store.menuGroups].sort((a, b) => a.id - b.id);
    if (this.menugroups.length > 0) {
      this.currentMenuGroup = this.menugroups[0].name;
    }

    this.menus = store.menus;
    this.menus.forEach((menu) => {
      if (menu.group == this.menugroups[0]?.id) {
        this.selectedMenu = menu.id;
        this.defaultMenuId = menu.id;
      }
    });

    this.locations = store.locations;
    this.tags = store.tags;
    this.tagRelationships = [];
    this.mapSettings = store.settings;
    this.links = store.links;
    this.linksGroup = store.linksGroups;
    this.kmlShapes = store.kmlLayers;
  }

  private initializeMap(): void {
    if (this.mapSetting) {
      this.loadProfiler.timeSync('map.load.initializeMap', () => {
        this.loadProfiler.timeSync('map.load.initializeMapOptions', () => {
          this.initializeMapOptions();
        });
        this.loadProfiler.timeSync('map.load.initLocations', () => {
          this.initLocations();
        });
        this.loadProfiler.timeSync('map.load.markerPreConfigure', () => {
          this.markerPreConfigure();
        });
        if (this.mapSetting.link_feature) {
          this.loadProfiler.timeSync('map.load.insertLinks', () => {
            this.insertLinkGeometries();
          });
        }
        this.loadProfiler.timeSync('map.load.kml', () => {
          this.initKmlLayers();
        });
        this.ensureMarkerClusterOnMap();
        this.mapLoaded = true;
        this.mapInteractionPhase = 'static';
      });
      this.isInitialStaticLoad = false;
      this.loadProfiler.endMark('map.load.interactive.end');
      this.loadProfiler.measure(
        'map.load.interactive.total',
        'map.load.total.start',
        'map.load.interactive.end'
      );
      this.loadProfiler.logInteractiveSummary();
      this.startEnrichPhase();
    }
  }

  private initKmlLayers() {
    const kmlShapes = this._kmlShapes ?? [];
    kmlShapes.forEach((storedKml) => {
      if (storedKml.geojson) {
        this.createAndAddGeoJsonLayer(storedKml, storedKml.geojson);
      }
    });
  }
  
  private createAndAddGeoJsonLayer(storedKml: any, geoJsonData: any) {
    storedKml.currentColor = storedKml.links_color;
    storedKml.visibility = true;

    const geojsonMarkerOptions = {
      radius: 2,
      fillColor: '#000000',
      color: '#000000',
      weight: 1,
      opacity: 1,
      fillOpacity: 1
    };

    const polygonStyle = {
      color: storedKml.links_color,
      weight: 3,
      opacity: storedKml.opacity
    };

    const geoJsonLayer = L.geoJSON(geoJsonData, {
      pointToLayer: (_feature, latlng) => {
        return L.circleMarker(latlng, geojsonMarkerOptions);
      },
      style: polygonStyle
    });

    this.kmlLayers[storedKml.id] = geoJsonLayer;
    this.queueKmlTooltipAttach(storedKml, geoJsonLayer);
    if (this.shouldLoadKML(storedKml)) {
      this.kmlLayers[storedKml.id].addTo(this.map);
    }
  }

  private queueKmlTooltipAttach(storedKml: any, geoJsonLayer: L.GeoJSON) {
    this.pendingKmlTooltipAttaches.push(() => {
      const layer = this.kmlLayers[storedKml.id] as L.GeoJSON | undefined;
      if (!layer) {
        return;
      }

      const geoJsonTooltip = L.tooltip({ sticky: true });
      geoJsonTooltip.setContent(storedKml.name);
      layer.bindTooltip(geoJsonTooltip);

      layer.eachLayer((featureLayer: L.Layer) => {
        const circle = featureLayer as L.CircleMarker;
        if (!circle.bindTooltip) {
          return;
        }
        const featureName = (circle as any).feature?.properties?.name ?? '';
        const tooltip = L.tooltip({ sticky: true });
        tooltip.setContent(storedKml.name + ' - ' + featureName);
        tooltip.on('add', () => geoJsonTooltip.setOpacity(0));
        tooltip.on('remove', () => geoJsonTooltip.setOpacity(1));
        circle.bindTooltip(tooltip);
      });
    });
  }

  private shouldLoadKML(kmlShape: KmlLayerDto): boolean {
    let parent_menu = this.getMenuById(kmlShape.parent_menu)
    if (!parent_menu) {
      return false;
    }
    let inCurrentMenu = parent_menu.id === this.selectedMenu;
    let menu_group = this.getMenuGroup(parent_menu.group);
    if (!menu_group) {
      return false;
    }
    let inCurrentMenuGroup = menu_group.name == this.currentMenuGroup;
    let shouldLoadSimultaneously = !inCurrentMenuGroup && this.isMenuSimultaneousAndSelectedInItsMenuGroup(parent_menu.id, menu_group);
    return inCurrentMenu || shouldLoadSimultaneously;
  }

  private isMenuSimultaneousAndSelectedInItsMenuGroup(menu_id: number, menu_group: MenuGroup | undefined = undefined) {
    return isMenuSimultaneousAndSelected(
      menu_id,
      buildEntityIndex(this.menus ?? []),
      buildEntityIndex(this.menugroups ?? []),
      this.selectedMenusByGroup,
      menu_group
    );
  }

  private initLocations() {
    if (this._locations) {
      this._locations.forEach((location: Location) => {
        location.onMap = false;
        location.activeColors = [];
        location.locationMarker = {};
        location.interactionsAttached = false;
      });
    }
  }

  private getOriginAndDestiny(
    location1: Location,
    location2: Location,
    shouldInvertLink: boolean
  ) {
    if (!shouldInvertLink) {
      return [
        new L.LatLng(location1.latitude, location1.longitude),
        new L.LatLng(location2.latitude, location2.longitude)
      ];
    } else {
      return [
        new L.LatLng(location2.latitude, location2.longitude),
        new L.LatLng(location1.latitude, location1.longitude)
      ];
    }
  }

  private insertLinks() {
    this.insertLinkGeometries();
    if (this.mapInteractionPhase === 'ready') {
      this.attachAllLinkInteractions();
    }
  }

  private insertLinkGeometries() {
    this.resetlinks();
    if (this._linksGroup && this._links && this._links.length > 0) {
      this.linksFeatureOn = true;
      const menusById = buildEntityIndex(this.menus ?? []);
      const menuGroupsById = buildEntityIndex(this.menugroups ?? []);
      this._links.forEach((link: Link) => {
        const loc1 = this.getLocationById(link.location_1);
        const loc2 = this.getLocationById(link.location_2);
        const linkgroup = this.getLinksGroupById(link.links_group);
        if (
          !isLinkEligible(
            link,
            linkgroup ?? undefined,
            this.selectedMenu,
            loc1 ?? undefined,
            loc2 ?? undefined,
            menusById,
            menuGroupsById,
            this.selectedMenusByGroup
          )
        ) {
          return;
        }
        linkgroup!.visibility = true;
        const values = this.getOriginAndDestiny(loc1!, loc2!, link.invert_link);
        const pointA = values[0];
        const pointB = values[1];

        const latlng1 = [pointA.lat, pointA.lng];
        const latlng2 = [pointB.lat, pointB.lng];

        const offsetX = latlng2[1] - latlng1[1];
        const offsetY = latlng2[0] - latlng1[0];

        const r = Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetY, 2));
        const theta = Math.atan2(offsetY, offsetX);

        const thetaOffset = 3.14 / 10;

        const r2 = r / 2 / Math.cos(thetaOffset);
        const theta2 = theta + thetaOffset;

        const midpointX = (r2 * Math.cos(theta2)) / 1.5 + latlng1[1];
        const midpointY = (r2 * Math.sin(theta2)) / 1.5 + latlng1[0];

        const midpointLatLng = [midpointY, midpointX];

        const pathOptions = {
          color: linkgroup!.links_color,
          weight: link.weight,
          opacity: linkgroup!.opacity,
          smoothFactor: 1,
          stroke: true,
          dashArray: '',
          dashOffset: ''
        };
        if (link.dashed) {
          pathOptions.dashArray = '10, 10';
          pathOptions.dashOffset = '10';
        }
        if (link.straight_link) {
          link.line = new L.Polyline([pointA, pointB], pathOptions);
        } else {
          link.line = L.curve(
            [
              'M',
              [latlng1[0], latlng1[1]],
              'S',
              [midpointLatLng[0], midpointLatLng[1]],
              [latlng2[0], latlng2[1]]
            ],
            pathOptions
          );
        }

        link.interactionsAttached = false;
        link.line.addTo(this.map);
      });
    }
  }

  private attachLinkInteractions(link: Link) {
    if (link.interactionsAttached || !link.line) {
      return;
    }
    const linkgroup = this.getLinksGroupById(link.links_group);
    if (!linkgroup) {
      return;
    }
    link.line.bindTooltip(linkgroup.name, { sticky: true });
    link.interactionsAttached = true;
  }

  private attachAllLinkInteractions() {
    if (!this._links) {
      return;
    }
    this._links.forEach((link) => this.attachLinkInteractions(link));
  }

  private initializeMapOptions() {
    this.map = L.map('map', {
      center: [
        this.mapSetting.initial_latitude,
        this.mapSetting.initial_longitude
        // -15,
        // -59
      ],
      zoom: this.mapSetting.initial_zoom_level + 3,
      // zoom: this.mapSetting.initial_zoom_level + 5,
      zoomControl: false,
      attributionControl: false
    });

    this.map.on('zoom', () => {
      this.markerClusterGroup.refreshClusters();
    });

    this.map.setMaxBounds([
      [-90, -340],
      [90, 310]
    ]);

    L.control
      .zoom({
        position: 'bottomright'
      })
      .addTo(this.map);

    // --- Use in the future for the user to customize a map ---
    let tiles;
    this.mapInitialized = true;

    let maxRadius = 15;
    if (this.mapSetting.cluster_close_tags === false) {
      maxRadius = 0;
    }

    switch (this.mapSetting.map_style) {
      case 'b':
        tiles = L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            maxZoom: 18,
            minZoom: 3,
            attribution:
              '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          }
        );
        tiles.addTo(this.map);
        break;

      case 'd':
        tiles = L.tileLayer(
          'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png',
          {
            maxZoom: 18,
            minZoom: 3,
            attribution:
              '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          }
        );
        tiles.addTo(this.map);
        break;

      default:
        this.mapInitialized = false;
        break;
    }

    this.markerClusterGroup = L.markerClusterGroup({
      iconCreateFunction: (cluster) => {
        let colors: Array<any> = [];

        cluster.getAllChildMarkers().forEach((marker: any) => {
          colors.push(
            ...[...new Set(marker.options.icon.options.html.match(/#....../g))]
          );
          colors = [...new Set(colors)];
          colors.splice(colors.indexOf('#5c5c5c'), 1);
        });
        const clusterLength = cluster.getChildCount();
        if (!this.deferClusterTooltips) {
          cluster.bindTooltip(clusterLength.toString() + ' locations grouped', {
            offset: L.point(0, 0),
            direction: 'left'
          });
        }
        return getMarkerIcon(colors, clusterLength);
      },
      maxClusterRadius: maxRadius,
      disableClusteringAtZoom: 12,
      showCoverageOnHover: false
    });

    this.footerUrl = this.mapSetting.footer_file;

    let mapName = "ChameleonMap"
    if (this.mapSetting && this.mapSetting.map_name) {
      mapName = this.mapSetting.map_name;
    }
    this.onboardingComponent.showOnboardingIfNeeded(mapName);
  }

  private getFirstMenuId() {
    // if (!isNaN(this._menus[0].id)) {
    //   this.defaultMenuId = this._menus[0].id;
    // } else {
    //   this.defaultMenuId = 0;
    // }
    // this.selectedMenu = this.defaultMenuId;
    // let chosenMenu = this.getMenuById(this.selectedMenu)
    // if (!chosenMenu) { return; }
    // chosenMenu.expanded = true;
  }

  private markerPreConfigure() {
    if (this._tags) {
      this._tags.forEach((tag: Tag) => {
        if (tag.active) {
          tag.currentColor = tag.color;
          tag.onMap = true;
          tag.dependenciesActive = true;
          tag.visibility = true;
        }
      });
      this.getFirstMenuId();
      this.loadProfiler.timeSync('map.load.insertMarkersByMenu', () => {
        this.insertMarkersByMenu(this.defaultMenuId);
      });
      if (typeof this.mapSetting.map_name === 'string')
        document.title = this.mapSetting.map_name;
      if (this.menus && this.locations && this.mapSettings)
        this.mapLoaded = true;
    }
    this.markerClusterGroup.refreshClusters();
  }

  private getMenuGroup(id: number): MenuGroup | undefined {
    for (const group of this.menugroups) {
      if (group.id === id) {
        return group;
      }
    }
    return undefined;
  }

  private insertMarkersByMenu(selectedTagsMenuId: number) {
    if (!this._locations || !this._tags) {
      return
    }

    let selectedMenu = this.getMenuById(this.selectedMenu);
    if (!selectedMenu) {
      return
    }
    let selectedMenuGroup = this.getMenuGroup(selectedMenu.group)

    this.resetMarkers();

    this.selectedMenu = selectedTagsMenuId;
    const menuHierarchy = this.getMenuById(selectedTagsMenuId)?.hierarchy_level;
    const otherMenuTags = this._tags.filter((currentTag: Tag) => {
      const currentTagHierarchy = this.getMenuById(
        currentTag.parent_menu
      )?.hierarchy_level;
      if (currentTagHierarchy && menuHierarchy) {
        return currentTagHierarchy == menuHierarchy;
      } else return false;
    });
    const allOtherMenuLocations: any[] = [];
    otherMenuTags.forEach((tag: Tag) => {
      tag.related_locations.forEach((locationId: number) => {
        if (!this.isTagInactive(tag)) {
          if (!allOtherMenuLocations.includes(locationId)) {
            allOtherMenuLocations.push(locationId);
          }
        }
      });
    });

    const menusById = buildEntityIndex(this.menus ?? []);
    const menuGroupsById = buildEntityIndex(this.menugroups ?? []);
    this._tags.forEach((tag: Tag) => {
      const isMenuShown = shouldShowTagForMenu(
        tag,
        selectedTagsMenuId,
        menusById,
        menuGroupsById,
        this.selectedMenusByGroup
      );
      if (
        tag.active &&
        tag.dependenciesActive &&
        tag.visibility &&
        isMenuShown
      ) {
        tag.related_locations.forEach((location_id: number) => {
          const location: any = this.getLocationById(location_id);

          if (location) {
            if (location.active) {
              const tagMenu = this.getMenuById(tag.parent_menu);
              if (tagMenu) {
                if (tagMenu.hierarchy_level > 1) {
                  // if (allOtherMenuLocations.includes(location.id)) {
                  this.insertLocationOnMap(location, tag.currentColor);
                  // }
                } else {
                  this.insertLocationOnMap(location, tag.currentColor);
                }
              }
            }
          }
        });
      }
    });
    if (!this.isInitialStaticLoad && this.mapSetting.link_feature) {
      this.insertLinks();
    }
    if (this._kmlShapes.length) this.insertKmlShapes();
    this.ensureMarkerClusterOnMap();
    if (this.mapInteractionPhase === 'ready') {
      this._locations.forEach((location) => {
        if (location.onMap && !location.interactionsAttached) {
          this.attachLocationInteractions(location);
        }
      });
      this.attachAllLinkInteractions();
    }
  }

  private insertKmlShapes() {
    this._kmlShapes.forEach(shape => {
      if (this.shouldLoadKML(shape)) {
        if (shape.visibility)
          this.insertKmlLayer(shape.id);
      } else {
        this.removeKmlLayer(shape.id);
      }
    });
  }

  private isTagInactive(tag: Tag) {
    return !tag?.active || !tag?.visibility || !tag?.dependenciesActive;
  }

  private checkLinksOnMap(location: Location) {
    for (const link of this._links) {
      if (this.getLinksGroupById(link.links_group)?.visibility) {
        if (link.location_1 == location.id || link.location_2 == location.id) {
          const loc1 = this.getLocationById(link.location_1);
          const loc2 = this.getLocationById(link.location_2);
          if (loc1?.onMap && loc2?.onMap) {
            link.line.addTo(this.map);
            if (this.mapInteractionPhase === 'ready') {
              this.attachLinkInteractions(link);
            }
          }
        }
      }
    }
  }

  private insertMarkersByTag(tag: Tag) {
    if (tag) {
      if (tag.active) {
        this.onDependenceChange(tag);

        tag.related_locations.forEach((location_id: number) => {
          const location: Location | null = this.getLocationById(location_id);

          if (location) {
            if (location.active) {
              this.insertLocationOnMap(location, tag.currentColor);
              this.checkLinksOnMap(location);
            }
          }
        });
        this.markerClusterGroup.refreshClusters();
      }
    }
  }

  private resetMarkers() {
    this.cancelEnrichPhase();
    this._locations.forEach((location: Location) => {
      if (location.onMap) {
        this.markerClusterGroup.removeLayer(location.locationMarker);
        location.locationMarker = {};
        location.onMap = false;
        location.activeColors = [];
        location.interactionsAttached = false;
      }
    });
  }

  private insertLocationOnMap(location: Location, color = '') {
    if (!location.onMap) {
      this.insertLocationShell(location, color);
      if (this.mapInteractionPhase === 'ready') {
        this.attachLocationInteractions(location);
      }
      return;
    }

    if (color != '') {
      location.activeColors.push(color);
    }
    location.locationMarker.setIcon(this.generatePinIcon(location.activeColors));
    if (location.interactionsAttached && location.locationMarker._popup) {
      this.ensureLocationPopup(location);
      location.popup += '</div>';
      location.locationMarker._popup.setContent(location.popup);
    }
  }

  private insertLocationShell(location: Location, color = '') {
    location.onMap = true;
    if (color != '') {
      location.activeColors = [color];
    }
    location.interactionsAttached = false;

    location.locationMarker = L.marker(
      [location.latitude, location.longitude],
      { icon: this.generatePinIcon(location.activeColors) }
    );

    this.markerClusterGroup.addLayer(location.locationMarker);
  }

  private ensureLocationPopup(location: Location): string {
    if (!location.popup) {
      location.popup = this.popupContent.buildLocationPopup(
        location.id,
        location.popupDto
      );
    }
    return location.popup;
  }

  private attachLocationInteractions(location: Location) {
    if (location.interactionsAttached || !location.onMap || !location.locationMarker) {
      return;
    }

    const popupHtml = this.ensureLocationPopup(location);
    const pop = L.responsivePopup({
      offset: L.point(-3, -11),
      hasTip: false,
      closeButton: false
    }).setContent(popupHtml);

    location.locationMarker
      .bindPopup(pop)
      .bindTooltip(location.name, {
        offset: L.point(-3, -18),
        direction: 'top'
      });

    this.addHoverFunction(location.locationMarker);
    location.interactionsAttached = true;
  }

  private ensureMarkerClusterOnMap() {
    if (!this.markerClusterOnMap && this.map && this.markerClusterGroup) {
      this.map.addLayer(this.markerClusterGroup);
      this.markerClusterOnMap = true;
    }
  }

  private addHoverFunction(marker: any) {
    marker.on('mouseover', function (ev: any) {
      ev.target.openTooltip();
      if (ev.target._icon)
        ev.target._icon.lastChild.classList.add('hover-icon');
    });
    marker.on('mouseout', function (ev: any) {
      if (ev.target._icon)
        ev.target._icon.lastChild.classList.remove('hover-icon');
    });
  }

  private insertTagOnPopup(tag: Tag, location: Location) {
    const tagOverlayButton = tag.overlayed_popup_content && tag.overlayed_popup_content != null
      ? this.popupContent.getTagOverlayButton(tag.id)
      : '';

    if (tag.description) {
      this.ensureLocationPopup(location);
      location.popup +=
        `
      <div class="tag-popup-${tag.id}">
        <h3 class="popup-subtitle">
          ${tag.name} ${tagOverlayButton}
        </h3>
        <p>${tag.description}</p> 
      </div>
      `;
    }
  }

  private generatePinIcon(colors: any) {
    const size = '24px';
    const border = '0.1px solid #5c5c5c';

    if (colors.length === 1) {
      var markerHtmlStyles = `
      background-color: ${colors[0]};
      width: ${size};
      height: ${size};
      display: block;
      left: -11px;
      top: -21px;
      position: relative;
      border-radius: ${size} ${size} 0;
      transform: rotate(45deg);
      border: ${border};`;
    } else {
      let increaseBorders = 0;
      if (colors.length > 2) {
        increaseBorders = 3 + colors.length; // Used to offset the visibility of the edge colors which was affected by the rotation (CSS pin)
      }
      let currentPercentage = 0;
      if (increaseBorders > 9) {
        increaseBorders = 9;
      } // The more colors a pin has, the more the edges are affected
      const basePercentage = Math.round(100.0 / colors.length);
      let gradient = '50grad';
      colors.forEach((color: string, index: number) => {
        currentPercentage = Math.floor(basePercentage * (index + 1));
        gradient +=
          ', ' +
          color +
          ' ' +
          (currentPercentage - basePercentage) +
          '%, ' +
          color +
          ' ' +
          currentPercentage +
          '%';
      });
      gradient = gradient
        .split(' ' + basePercentage.toString() + '%')
        .join(' ' + (basePercentage + increaseBorders).toString() + '%');
      gradient = gradient
        .split(
          ' ' +
          (basePercentage * colors.length - basePercentage).toString() +
          '%'
        )
        .join(' ' + (100 - basePercentage - increaseBorders).toString() + '%');

      var markerHtmlStyles = `
      background-image: linear-gradient(${gradient});
      width: ${size};
      height: ${size};
      display: block;
      left: -11px;
      top: -21px;
      position: relative;
      border-radius: 100% 100% 0;
      transform: rotate(45deg);
      border: 0.1px solid #5c5c5c`;
    }

    const icon = L.divIcon({
      className: 'custom-pin',
      html: `<span style="${markerHtmlStyles}"><span style="height: 11px; width: 11px; background-color: white; border-radius: 50%; display: flex; margin-left: 20%; margin-top: 20%;"></span></span>`
    });

    return icon;
  }

  private getMaxLocationId() {
    let maxLocationId = 0;

    for (const location of this._locations) {
      if (location.id > maxLocationId) {
        maxLocationId = location.id;
      }
    }

    return maxLocationId;
  }

  public getLocationById(location_id: number) {
    for (const location of this._locations) {
      if (location.id === location_id) {
        return location;
      }
    }
    return null;
  }

  private getLinksGroupById(linksGroupid: number) {
    for (const linkgroup of this._linksGroup) {
      if (linkgroup.id === linksGroupid) {
        return linkgroup;
      }
    }
    return null;
  }

  private getMaxTagId() {
    let maxTagId = 0;

    for (const tag of this._tags)
      if (tag.id > maxTagId)
        maxTagId = tag.id;

    return maxTagId;
  }

  public getTagById(tagId: number) {
    for (const tag of this._tags) {
      if (tag.id === tagId) {
        return tag;
      }
    }
    return null;
  }

  private getMenuById(menuId: number) {
    for (const menu of this._menus) {
      if (menu.id === menuId) {
        return menu;
      }
    }
    return null;
  }

  private hideLinksByLinkGroup(lg: LinksGroup) {
    if (lg) {
      lg.visibility = false;
      for (const link of this._links) {
        if (link.links_group == lg.id && link.line != null) {
          link.line.remove(this.map);
        }
      }
    }
  }

  private resetlinks() {
    if (this._links) {
      for (const link of this._links) {
        if (link.line != null) {
          link.line.remove(this.map);
          link.interactionsAttached = false;
        }
      }
    }
  }

  private insertLinkByLinkGroup(lg: LinksGroup) {
    if (lg) {
      lg.visibility = true;
      for (const link of this._links) {
        const elementLinksGroup = this.getLinksGroupById(link.links_group);
        if (!elementLinksGroup) return;
        if (link.links_group == lg.id || this.isMenuSimultaneousAndSelectedInItsMenuGroup(elementLinksGroup.parent_menu)) {
          const loc1 = this.getLocationById(link.location_1);
          const loc2 = this.getLocationById(link.location_2);
          if (loc1 && loc2 && loc1.onMap && loc2.onMap) {
            link.line.addTo(this.map);
            if (this.mapInteractionPhase === 'ready') {
              this.attachLinkInteractions(link);
            }
          }
        }
      }
    }
  }

  private removeMarkerByTag(tag: Tag) {
    if (tag) {
      tag.visibility = false;
      tag.related_locations.forEach((relatedLocationId: number) => {
        const location = this.getLocationById(relatedLocationId);
        if (location) {
          if (
            tag.parent_menu == this.selectedMenu &&
            this.locationIsShowingTag(location, tag)
          ) {
            this.removeColorFromLocationMarker(location, tag.color);
          }
        }
      });
      this.onDependenceChange(tag);
      this.markerClusterGroup.refreshClusters();
    }
  }

  private locationIsShowingTag(location: Location, tag: Tag) {
    return location.activeColors.includes(tag.currentColor);
  }

  private removeColorFromLocationMarker(location: Location, color: string) {
    if (location.activeColors.length === 1) {
      this.removeLocationFromMap(location);
    } else {
      location.activeColors.splice(location.activeColors.indexOf(color), 1);
      location.locationMarker.setIcon(
        this.generatePinIcon(location.activeColors)
      );
    }
  }

  private removeLocationFromMap(location: Location) {
    this.markerClusterGroup.removeLayer(location.locationMarker);
    location.onMap = false;
    location.locationMarker = {};
    location.interactionsAttached = false;

    for (const link of this._links) {
      if (link.location_1 == location.id || link.location_2 == location.id) {
        link.line.remove(this.map);
      }
    }
  }

  private removeTagFromPopups(tag: Tag) {
    tag.related_locations.forEach((location_id: number) => {
      const location = this.getLocationById(location_id);
      if (!location) {
        return;
      }
      if (location.popup || location.popupDto) {
        const popup = this.ensureLocationPopup(location);
        location.popup = this.removeTagFromDiv(tag.id, popup);
        if (location.interactionsAttached && location.locationMarker?._popup) {
          location.locationMarker.bindPopup(location.popup);
        }
      }
    });
  }

  private removeTagFromDiv(tag_id: number, popup: string) {
    return popup.replace(
      `<div class="tag-popup-${tag_id}">`,
      `<div class="tag-popup-${tag_id}" style="display: none !important;">`
    );
  }

  private putTagBackOnPopup(tag: Tag) {
    tag.related_locations.forEach((location_id: number) => {
      const location = this.getLocationById(location_id);
      if (!location) {
        return;
      }
      if (location.popup || location.popupDto) {
        const popup = this.ensureLocationPopup(location);
        location.popup = this.makeTagVisibleOnDiv(tag.id, popup);
        if (location.interactionsAttached && location.locationMarker?._popup) {
          location.locationMarker.bindPopup(location.popup);
        }
      }
    });
  }

  private makeTagVisibleOnDiv(tag_id: number, popup: string) {
    return popup.replace(
      `<div class="tag-popup-${tag_id}" style="display: none !important;">`,
      `<div class="tag-popup-${tag_id}">`
    );
  }

  private onDependenceChange(parentTag: Tag) {
    if (parentTag.child_tags) {
      parentTag.child_tags.forEach((tagRelation: any) => {
        const childTag = this.getTagById(tagRelation.child_tag);
        if (childTag) {
          this.checkDependenciesAndPopups(childTag);
        }
      });
    }
  }


  private removeKmlLayer(kmlID: number) {
    const layer = this.kmlLayers[kmlID];
    if (layer) {
      this.map.removeLayer(layer);
    }
  }

  private insertKmlLayer(kmlID: number) {
    const layer = this.kmlLayers[kmlID];
    if (layer) {
      this.map.addLayer(layer);
    }
  }

  private checkDependenciesAndPopups(tag: Tag) {
    if (this.anyClusterIsActive(tag)) {
      tag.dependenciesActive = true;
      if (tag.visibility) {
        // if the tag has the visibility off, popup must not be changed
        this.putTagBackOnPopup(tag);
      }
    } else {
      tag.dependenciesActive = false;
      this.removeTagFromPopups(tag);
    }
    // triggers function to check on the tag childs recursively
    this.onDependenceChange(tag);
  }

  private anyClusterIsActive(childTag: Tag) {
    return isAnyClusterActive(childTag, buildEntityIndex(this._tags ?? []));
  }

  public onMenuCliked(event: any) {
    this.insertMarkersByMenu(event.selectedTagsMenuId);
  }

  public onTagRemoval(event: any) {
    this.removeTagFromPopups(event.selectedTag);
    this.removeMarkerByTag(event.selectedTag);
  }

  public onTagReactivated(event: any) {
    this.insertMarkersByTag(event.tag);
    this.putTagBackOnPopup(event.tag);
  }

  public onShapeRemoval(event: any) {
    this.removeKmlLayer(event.shape.id);
  }

  public onShapeReactivated(event: any) {
    this.insertKmlLayer(event.shape.id);
  }

  public onLinkRemoval(event: any) {
    this.hideLinksByLinkGroup(event.selectedLG);
  }

  public onLinkReactivated(event: any) {
    this.insertLinkByLinkGroup(event.selectedLG);
  }

  public onButtonClicked(event: any) {
    this.currentMenuGroup = event.clickedMenu;
  }

  public showHowToHelpMessage(id: number) {
    this.overlayedPopup.activateByLocation(this.getLocationById(id))
  }

  private checkOrientation() {
    // Consider portrait mode as orientation 0 or 180
    this.showRotateMessage = window.orientation === 0 || window.orientation === 180;
  }

  closeMessage() {
    this.showRotateMessage = false;
  }

  public aboutUsButtonClick() {
    let popupContent: string =  `
      <div style="
        position: relative;
        font-family: Arial, sans-serif;
        padding: 40px 20px 20px 20px;
        max-width: 90%%;
        border: 4px solid transparent;
        border-radius: 15px;
        background: linear-gradient(white, white) padding-box,
                    linear-gradient(135deg, #00f9ff, #00ff94, #fff200, #ff005d, #a100ff) border-box;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      ">

        <!-- Logo in the top-left corner of the frame -->
        <img src="/assets/chameleonMapLogo-transparent.png" alt="ChameleonMap Logo"
            style="position: absolute; top: -30px; left: -30px; height: 80px; z-index: 1; background: white; border-radius: 50%; padding: 5px; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">

        <!-- Main content -->
        <p style="text-align: center;">
          <strong>ChameleonMap ®</strong> is a pioneering open-source system born from the collaboration between the Informatics Institute of the Federal University of Rio Grande do Sul (INF-UFRGS) and the Brazilian National Research and Education Network (RNP). 
          Designed to represent complex and dynamic topologies, it adapts and evolves like its namesake, the chameleon, offering an interactive mapping solution driven by geolocated data.
        </p>

        <p style="text-align: center;">
          With its remarkable adaptability, ChameleonMap is suited for a wide range of applications — from visualizing computer networks to analyzing socio-economic infrastructures. Its modular design makes it a powerful and customizable tool across diverse domains. This collaborative development effort has resulted in a system that balances technical sophistication with ease of use. ChameleonMap is both intuitive for end-users and robust enough for administrators, making it an accessible and efficient solution for dynamic topology visualization.
        </p>

        <!-- Authors and Logos using Table -->
        <table style="display: flex; width: 100%; margin-top: 15px; vertical-align: middle;">
          <tr>
            <!-- Logos -->
            <td style="width: 50%; border: 1px solid #ccc; vertical-align: middle">
              <img src="/assets/inf-logo.svg" alt="Logo INF-UFRGS" style="width: 25%; margin: 5px; vertical-align: middle;">
              <img src="/assets/rnp-logo.png" alt="Logo RNP" style="width: 25%; margin: 5px; vertical-align: middle;"><br>
            </td>
            
            <!-- Authors -->
            <td style="width: 50%; padding: 10px; border: 1px solid #ccc; text-align: center; vertical-align: middle;">
              <p><strong>Authors:</strong><br>
                Eduardo Peretto<br>
                Gabriel Vassoler<br>
                Gustavo Hermínio de Araújo<br>
                Leonardo Lauryel Batista dos Santos<br>
                Prof. Lisandro Zambenedetti Granville<br>
                Prof. Luciano Paschoal Gaspary<br>
                Manoel Narciso Reis Soares Filho
              </p>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <hr style="margin: 30px auto; width: 60%;">
        <footer style="text-align: center; font-size: 0.9em;">
          <p>
            <strong><a href="https://github.com/seu-usuario/seu-repositorio" target="_blank">ChameleonMap</a> ®</strong><br>
            Powered by <a href="https://leafletjs.com/" target="_blank">Leaflet</a> and <a href="https://www.openstreetmap.org/" target="_blank">OpenStreetMap</a>
          </p>
        </footer>
      </div>
    `
    
    this.overlayedPopup.activateWithPersonalizedContent(popupContent, "About This Map")
    console.log('Popup activated!');
  }

  private cancelEnrichPhase() {
    this.enrichSchedulerHandle?.cancel();
    this.enrichSchedulerHandle = null;
    this.enrichGeneration++;
  }

  private startEnrichPhase() {
    this.mapInteractionPhase = 'enriching';
    this.cancelEnrichPhase();
    const generation = this.enrichGeneration;

    this.loadProfiler.mark('map.load.enrichInteractions.start');

    const work: Array<() => void> = [];

    for (const location of this._locations ?? []) {
      if (location.onMap && !location.interactionsAttached) {
        work.push(() => this.attachLocationInteractions(location));
      }
    }
    for (const link of this._links ?? []) {
      if (link.line && !link.interactionsAttached) {
        work.push(() => this.attachLinkInteractions(link));
      }
    }
    work.push(...this.pendingKmlTooltipAttaches);

    const chunkSize = MapComponent.MARKER_INTERACTION_CHUNK;

    this.enrichSchedulerHandle = runBatchedWork(work, chunkSize, () => {
      if (generation !== this.enrichGeneration) {
        return;
      }
      this.loadProfiler.timeSync('map.load.attachClusterInteractions', () => {
        this.attachClusterInteractions();
      });
      this.finishEnrichPhase();
    });
  }

  private attachClusterInteractions() {
    this.deferClusterTooltips = false;
    if (!this.clusterHoverAttached && this.markerClusterGroup) {
      this.addHoverFunction(this.markerClusterGroup);
      this.clusterHoverAttached = true;
    }
    this.markerClusterGroup?.refreshClusters();
  }

  private finishEnrichPhase() {
    this.mapInteractionPhase = 'ready';
    this.enrichSchedulerHandle = null;

    this.loadProfiler.endMark('map.load.enrichInteractions.end');
    this.loadProfiler.measure(
      'map.load.enrichInteractions',
      'map.load.enrichInteractions.start',
      'map.load.enrichInteractions.end'
    );
    this.loadProfiler.endMark('map.load.full.end');
    this.loadProfiler.measure(
      'map.load.full.total',
      'map.load.total.start',
      'map.load.full.end'
    );
    this.loadProfiler.logFullSummary();
  }
}

function getMarkerIcon(
  colors: any[],
  locationCount: number
): L.DivIcon | L.Icon<L.IconOptions> {
  let style;
  switch (colors.length) {
    case 1:
      style = `"border-right-color: ${colors[0]}; border-top-color: ${colors[0]}; border-bottom-color: ${colors[0]}; border-left-color: ${colors[0]};"`;
      return L.divIcon({
        html:
          `<span class="clustercolored-icon" style=${style}><b>` +
          locationCount +
          '</b></span>'
      });
    case 2:
      style = `"border-right-color: ${colors[0]}; border-top-color: ${colors[0]}; border-bottom-color: ${colors[1]}; border-left-color: ${colors[1]};"`;
      return L.divIcon({
        html:
          `<span class="clustercolored-icon" style=${style}><b>` +
          locationCount +
          '</b></span>'
      });
    case 3:
      style = `"border-right-color: ${colors[0]}; border-top-color: ${colors[0]}; border-bottom-color: ${colors[1]}; border-left-color: ${colors[2]};"`;
      return L.divIcon({
        html:
          `<span class="clustercolored-icon" style=${style}><b>` +
          locationCount +
          '</b></span>'
      });
    case 4:
      style = `"border-right-color: ${colors[0]}; border-top-color: ${colors[1]}; border-bottom-color: ${colors[2]}; border-left-color: ${colors[3]};"`;
      return L.divIcon({
        html:
          `<span class="clustercolored-icon" style=${style}><b>` +
          locationCount +
          '</b></span>'
      });
    default:
      return L.divIcon({
        html: '<span class="cluster-icon"><b>' + locationCount + '</b></span>'
      });
  }
}
