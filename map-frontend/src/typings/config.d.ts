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
    pinned?: boolean;
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

  /** A single language's translation of an owning institution's popup content */
  export interface PopupInstitutionTranslation {
    readonly language_code: string;
    readonly description: string;
    readonly overlayed_popup_content: string;
  }

  /**
   * Popup content (summary + full HTML) of one institution owning a
   * location, plus its translations. A location may have more than
   * one of these -- one tab per institution in the popup.
   */
  export interface PopupInstitution {
    readonly name: string;
    readonly description: string;
    readonly overlayed_popup_content: string;
    // Same PREN(1)/NREN(2) menu id as the map's own PREN/NREN filter
    // -- a location can belong to networks in both menus, and only
    // the one matching the currently selected menu should show.
    readonly parent_menu: number;
    readonly translations: PopupInstitutionTranslation[];
  }

  export interface Location {
    readonly id: number;
    readonly name: string;
    readonly latitude: number;
    readonly longitude: number;
    readonly active: boolean;
    readonly popup_institutions: PopupInstitution[];

    onMap: boolean;
    activeColors: Array<string>;
    locationMarker: any;
    popup: string;
    hasPopupContent: boolean;
    activePopupInstitutionIndex: number;
    /*  containedTags: Array<{tag: Tag, activeOnMap: boolean}>; */
  }

  /** A single language's translation of a UIString */
  export interface UIStringTranslation {
    readonly language_code: string;
    readonly text: string;
  }

  /** A piece of fixed map interface vocabulary, and its translations */
  export interface UIString {
    readonly key: string;
    readonly text: string;
    readonly translations: UIStringTranslation[];
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
    readonly networks: string[];
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
