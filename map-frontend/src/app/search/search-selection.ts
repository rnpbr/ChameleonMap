export interface SelectionTagLike {
  readonly id: number;
  readonly parent_menu: number;
  readonly active: boolean;
  readonly visibility: boolean;
  readonly related_locations: number[];
  readonly parent_tags: ReadonlyArray<{ readonly parent_tag: number }>;
}

export interface SelectionLayerLike {
  readonly id: number;
  readonly parent_menu: number;
}

export interface SelectionLinkLike {
  readonly links_group: number;
  readonly location_1: number;
  readonly location_2: number;
}

export interface SearchLayerData {
  readonly tags: SelectionTagLike[];
  readonly linksGroups: SelectionLayerLike[];
  readonly kmlLayers: SelectionLayerLike[];
  readonly links: SelectionLinkLike[];
}

export interface LayerSelection {
  readonly tagIds: number[];
  readonly linksGroupIds: number[];
  readonly kmlIds: number[];
}

export interface ResolvedLayerSelection {
  readonly tagIdsToShow: Set<number>;
  readonly linksGroupIds: Set<number>;
  readonly kmlIds: Set<number>;
  readonly menuIdsToPin: Set<number>;
}

export function resolveLayerSelection(
  selection: LayerSelection,
  data: SearchLayerData
): ResolvedLayerSelection {
  const tagsById = new Map(data.tags.map((tag) => [tag.id, tag]));
  const tagIds = new Set<number>();
  const menuIdsToPin = new Set<number>();
  const show = (tag: SelectionTagLike) => {
    tagIds.add(tag.id);
    menuIdsToPin.add(tag.parent_menu);
  };

  selection.tagIds.forEach((tagId) => {
    const tag = tagsById.get(tagId);
    if (tag) show(tag);
  });

  const linksGroupIds = new Set(selection.linksGroupIds);
  data.linksGroups.forEach((linksGroup) => {
    if (linksGroupIds.has(linksGroup.id)) menuIdsToPin.add(linksGroup.parent_menu);
  });
  pickEndpointCarriers(linkEndpoints(data.links, linksGroupIds), data.tags, tagIds).forEach(show);

  const kmlIds = new Set(selection.kmlIds);
  data.kmlLayers.forEach((kml) => {
    if (kmlIds.has(kml.id)) menuIdsToPin.add(kml.parent_menu);
  });

  return {
    tagIdsToShow: withAncestorTags(tagIds, data.tags),
    linksGroupIds,
    kmlIds,
    menuIdsToPin
  };
}

export function withAncestorTags(tagIds: Iterable<number>, tags: SelectionTagLike[]): Set<number> {
  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
  const result = new Set<number>();
  const pending = [...tagIds];

  while (pending.length > 0) {
    const tagId = pending.pop()!;
    if (result.has(tagId)) continue;
    result.add(tagId);
    tagsById.get(tagId)?.parent_tags.forEach((relation) => pending.push(relation.parent_tag));
  }

  return result;
}

export function pickRevealTag<T extends SelectionTagLike>(
  locationId: number,
  tags: T[],
  selectedMenuId: number,
  isMenuPinned: (menuId: number) => boolean
): T | undefined {
  const candidates = tags.filter(
    (tag) => tag.active && tag.related_locations.includes(locationId)
  );
  return (
    candidates.find((tag) => tag.parent_menu === selectedMenuId) ??
    candidates.find((tag) => isMenuPinned(tag.parent_menu)) ??
    candidates[0]
  );
}

function linkEndpoints(links: SelectionLinkLike[], linksGroupIds: Set<number>): Set<number> {
  const endpoints = new Set<number>();
  links.forEach((link) => {
    if (!linksGroupIds.has(link.links_group)) return;
    endpoints.add(link.location_1);
    endpoints.add(link.location_2);
  });
  return endpoints;
}

function pickEndpointCarriers(
  endpoints: Set<number>,
  tags: SelectionTagLike[],
  shownTagIds: Set<number>
): SelectionTagLike[] {
  const uncovered = new Set(endpoints);
  tags.forEach((tag) => {
    if (shownTagIds.has(tag.id)) tag.related_locations.forEach((id) => uncovered.delete(id));
  });

  const candidates = tags.filter((tag) => tag.active && !shownTagIds.has(tag.id));
  const carriers: SelectionTagLike[] = [];
  const cover = (pool: SelectionTagLike[]) => {
    while (uncovered.size > 0) {
      let best: SelectionTagLike | undefined;
      let bestCount = 0;
      for (const tag of pool) {
        if (carriers.includes(tag)) continue;
        const count = tag.related_locations.filter((id) => uncovered.has(id)).length;
        if (count > bestCount) {
          best = tag;
          bestCount = count;
        }
      }
      if (!best) return;
      carriers.push(best);
      best.related_locations.forEach((id) => uncovered.delete(id));
    }
  };

  cover(candidates.filter((tag) => tag.visibility));
  cover(candidates);
  return carriers;
}
