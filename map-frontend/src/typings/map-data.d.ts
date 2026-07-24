export {};

declare global {
  export interface TagPopupSectionDto {
    readonly tag_id: number;
    readonly name: string;
    readonly description_html: string;
    readonly has_overlay: boolean;
  }

  export interface LocationPopupDto {
    readonly location_id: number;
    readonly title: string;
    readonly description_html: string;
    readonly has_overlay: boolean;
    readonly tags: TagPopupSectionDto[];
  }

  export interface MapSettingsDto {
    readonly id: number;
    readonly map_name: string;
    readonly map_style: string;
    readonly inherit_children_tag_locations: boolean;
    readonly cluster_close_tags: boolean;
    readonly initial_zoom_level: number;
    readonly initial_latitude: number;
    readonly initial_longitude: number;
    readonly link_feature: boolean;
    readonly hide_menu_group_when_unique: boolean;
    readonly footer_file: string;
  }

  export interface KmlLayerDto {
    readonly id: number;
    readonly name: string;
    readonly parent_menu: number;
    readonly links_color: string;
    readonly opacity: number;
    readonly geojson: any | null;
    visibility: boolean;
    currentColor: string;
  }

  export interface MapDataBundle {
    readonly version: number;
    readonly settings: MapSettingsDto | null;
    readonly menu_groups: MenuGroup[];
    readonly menus: Menu[];
    readonly locations: Location[];
    readonly tags: Tag[];
    readonly links: Link[];
    readonly links_groups: LinksGroup[];
    readonly kml_layers: KmlLayerDto[];
    readonly location_popups: Record<string, LocationPopupDto>;
  }
}
