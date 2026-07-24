export interface TagRelationshipRecord {
  readonly id: number;
  readonly parent_tag: number;
  readonly child_tag: number;
  readonly cluster_id: number | null;
}

export interface TagLike {
  readonly id: number;
  readonly parent_menu: number;
  related_locations: number[];
  child_tags: TagRelationshipRecord[];
  parent_tags: TagRelationshipRecord[];
  visibility: boolean;
  dependenciesActive: boolean;
}

export interface MenuLike {
  readonly id: number;
  readonly group: number;
  readonly hierarchy_level: number;
}

export interface MenuGroupLike {
  readonly id: number;
  readonly name: string;
  readonly simultaneous_context: boolean;
}

export interface LinksGroupLike {
  readonly id: number;
  readonly parent_menu: number;
}

export interface LinkLike {
  readonly id: number;
  readonly location_1: number;
  readonly location_2: number;
  readonly links_group: number;
}

export interface LocationLike {
  readonly id: number;
  onMap: boolean;
}

export function buildTagRelationshipIndexes<T extends TagLike>(
  tags: T[],
  relationships: TagRelationshipRecord[]
): void {
  tags.forEach((tag) => {
    tag.child_tags = [];
    tag.parent_tags = [];
  });

  relationships.forEach((relation) => {
    tags.forEach((tag) => {
      if (relation.parent_tag === tag.id) {
        tag.child_tags.push(relation);
      } else if (relation.child_tag === tag.id) {
        tag.parent_tags.push(relation);
      }
    });
  });
}

export function isIndirectChild(
  tag: TagLike,
  childTag: TagLike,
  menusById: Map<number, MenuLike>
): boolean {
  const isDirectChild = tag.child_tags.some(
    (relation) => relation.child_tag === childTag.id
  );
  if (isDirectChild) {
    return false;
  }

  const tagMenuLevel = menusById.get(tag.parent_menu)?.hierarchy_level;
  const childTagMenuLevel = menusById.get(childTag.parent_menu)?.hierarchy_level;
  if (tagMenuLevel !== undefined && childTagMenuLevel !== undefined) {
    return childTagMenuLevel > tagMenuLevel + 1;
  }
  return false;
}

export function resolveInheritedLocations<T extends TagLike>(
  tag: T,
  iterationTag: T,
  tagsById: Map<number, T>,
  menusById: Map<number, MenuLike>
): void {
  if (!iterationTag.child_tags?.length) {
    return;
  }

  iterationTag.child_tags.forEach((childRelation) => {
    const child = tagsById.get(childRelation.child_tag);
    if (!child) {
      return;
    }

    if (!isIndirectChild(tag, child, menusById)) {
      child.related_locations.forEach((locationId) => {
        tag.related_locations.push(locationId);
      });
    } else {
      const clusterIds = [
        ...new Set(child.parent_tags.map((relation) => relation.cluster_id)),
      ];
      const relatedMenus = child.parent_tags
        .map((relation) => tagsById.get(relation.parent_tag)?.parent_menu)
        .filter((menuId): menuId is number => menuId !== undefined);

      if (clusterIds.length === 1 || !relatedMenus.includes(tag.parent_menu)) {
        child.related_locations.forEach((locationId) => {
          tag.related_locations.push(locationId);
        });
      }
    }

    child.child_tags.forEach((nestedRelation) => {
      const nestedTag = tagsById.get(nestedRelation.parent_tag);
      if (nestedTag) {
        resolveInheritedLocations(tag, nestedTag, tagsById, menusById);
      }
    });
  });

  tag.related_locations = [...new Set(tag.related_locations)];
}

export function isAnyClusterActive<T extends TagLike>(
  childTag: T,
  tagsById: Map<number, T>
): boolean {
  const clusterIds = [...new Set(childTag.parent_tags.map((relation) => relation.cluster_id))];
  let isAnyClusterActive = true;

  clusterIds.forEach((clusterId) => {
    const parentsInCluster = childTag.parent_tags.filter(
      (relation) => relation.cluster_id === clusterId
    );
    if (areParentsInactive(parentsInCluster, tagsById)) {
      isAnyClusterActive = false;
    }
  });

  return isAnyClusterActive;
}

export function areParentsInactive<T extends TagLike>(
  relations: TagRelationshipRecord[],
  tagsById: Map<number, T>
): boolean {
  return relations.every((relation) => {
    const parent = tagsById.get(relation.parent_tag);
    return parent?.visibility === false || parent?.dependenciesActive === false;
  });
}

export function isMenuSimultaneousAndSelected(
  menuId: number,
  menusById: Map<number, MenuLike>,
  menuGroupsById: Map<number, MenuGroupLike>,
  selectedMenusByGroup: Record<string, number>,
  menuGroup?: MenuGroupLike
): boolean {
  const menu = menusById.get(menuId);
  if (!menu) {
    return false;
  }

  let resolvedMenuGroup = menuGroup;
  if (!resolvedMenuGroup) {
    resolvedMenuGroup = menuGroupsById.get(menu.group);
  }
  if (!resolvedMenuGroup?.simultaneous_context) {
    return false;
  }

  if (selectedMenusByGroup[resolvedMenuGroup.name] === undefined) {
    selectedMenusByGroup[resolvedMenuGroup.name] = menuId;
    return true;
  }

  return selectedMenusByGroup[resolvedMenuGroup.name] === menuId;
}

export function isLinkEligible(
  link: LinkLike,
  linksGroup: LinksGroupLike | undefined,
  selectedMenuId: number,
  loc1: LocationLike | undefined,
  loc2: LocationLike | undefined,
  menusById: Map<number, MenuLike>,
  menuGroupsById: Map<number, MenuGroupLike>,
  selectedMenusByGroup: Record<string, number>
): boolean {
  if (!linksGroup || !loc1 || !loc2) {
    return false;
  }

  const isSimultaneous = isMenuSimultaneousAndSelected(
    linksGroup.parent_menu,
    menusById,
    menuGroupsById,
    selectedMenusByGroup
  );

  if (linksGroup.parent_menu !== selectedMenuId && !isSimultaneous) {
    return false;
  }

  return isSimultaneous || (loc1.onMap && loc2.onMap);
}

export function shouldShowTagForMenu(
  tag: TagLike,
  selectedMenuId: number,
  menusById: Map<number, MenuLike>,
  menuGroupsById: Map<number, MenuGroupLike>,
  selectedMenusByGroup: Record<string, number>
): boolean {
  return (
    tag.parent_menu === selectedMenuId ||
    isMenuSimultaneousAndSelected(
      tag.parent_menu,
      menusById,
      menuGroupsById,
      selectedMenusByGroup
    )
  );
}

export function buildEntityIndex<T extends { id: number }>(items: T[]): Map<number, T> {
  return new Map(items.map((item) => [item.id, item]));
}
