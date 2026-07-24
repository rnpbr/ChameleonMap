export {};

declare global {

  export interface MenuGroup {
    readonly id: number;
    readonly name: string;
    readonly simultaneous_context: boolean;
  }

  export interface Menu {
    readonly id: number;
    readonly name: string;
    readonly group: number;
    readonly hierarchy_level: number;
    readonly active: boolean;
    expanded: boolean;
    pinned: boolean;
    isEyeVisibilityOpen?: boolean;
  }

  export interface Tag {
    readonly id: number;
    readonly name: string;
    readonly color: string;
    currentColor: string;
    readonly description: string;
    readonly parent_menu: number;
    related_locations: Array<number>;
    readonly active: boolean;
    readonly sidebar_content: string;
    readonly overlayed_popup_content: string;

    onMap: boolean;
    child_tags: Array<TagRelationship>;
    parent_tags: Array<TagRelationship>;
    dependenciesActive: boolean;
    visibility: boolean;
  }

  export interface Location {
    readonly id: number;
    readonly name: string;
    readonly latitude: number;
    readonly longitude: number;
    readonly description: string;
    readonly active: boolean;
    
    onMap: boolean;
    activeColors: Array<string>;
    locationMarker: any;
    popup: string;
    overlayed_popup_content: string;
    /*  containedTags: Array<{tag: Tag, activeOnMap: boolean}>; */
  }

  export interface TagRelationship {
    readonly id: number;
    readonly parent_tag: number;
    readonly child_tag: number;
    readonly is_subtag: boolean;
  }

  export interface Link {
    readonly id: number;
    readonly display_name: string;
    readonly popup_description: string;
    readonly location_1: number;
    readonly location_2: number;
    readonly links_group: number;
    readonly curvature: number;
    readonly invert_link: boolean;
    readonly straight_link: boolean;
    readonly dashed: boolean;
    readonly weight: number;
    line: any;
  }

  export interface LinksGroup {
    readonly id: number;
    readonly name: string;
    readonly links_color: string;
    readonly sidebar_content: string;
    readonly opacity: number;
    readonly parent_menu: number;
    visibility: boolean;
  }

  export interface KmlShape {
    readonly id: number;
    readonly name: string;
    readonly parent_menu: number;
    readonly links_color: string;
    readonly kml_file: string;
    readonly opacity: number;
    visibility: boolean;
    currentColor: string;
  }
}
