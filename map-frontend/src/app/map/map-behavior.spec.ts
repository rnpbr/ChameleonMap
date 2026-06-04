import {
  buildTagRelationshipIndexes,
  isAnyClusterActive,
  isLinkEligible,
  isMenuSimultaneousAndSelected,
  resolveInheritedLocations,
  TagLike,
  TagRelationshipRecord
} from './map-behavior';

function createTag(overrides: Partial<TagLike> & Pick<TagLike, 'id'>): TagLike {
  return {
    parent_menu: 1,
    related_locations: [],
    child_tags: [],
    parent_tags: [],
    visibility: true,
    dependenciesActive: true,
    ...overrides
  };
}

describe('map-behavior', () => {
  it('builds parent and child relationship indexes', () => {
    const tags: TagLike[] = [
      createTag({ id: 1 }),
      createTag({ id: 2 }),
      createTag({ id: 3 })
    ];
    const relationships: TagRelationshipRecord[] = [
      { id: 10, parent_tag: 1, child_tag: 2, cluster_id: 1 },
      { id: 11, parent_tag: 3, child_tag: 2, cluster_id: 2 }
    ];

    buildTagRelationshipIndexes(tags, relationships);

    expect(tags[0].child_tags).toEqual([relationships[0]]);
    expect(tags[1].parent_tags).toEqual(relationships);
    expect(tags[2].child_tags).toEqual([relationships[1]]);
  });

  it('inherits direct child locations when enabled', () => {
    const parent = createTag({ id: 1, related_locations: [1], child_tags: [{ id: 1, parent_tag: 1, child_tag: 2, cluster_id: 1 }] });
    const child = createTag({ id: 2, related_locations: [2, 3], parent_tags: [{ id: 1, parent_tag: 1, child_tag: 2, cluster_id: 1 }] });
    const tagsById = new Map<number, TagLike>([
      [1, parent],
      [2, child]
    ]);
    const menusById = new Map([
      [1, { id: 1, group: 1, hierarchy_level: 0 }],
      [2, { id: 2, group: 1, hierarchy_level: 1 }]
    ]);

    resolveInheritedLocations(parent, parent, tagsById, menusById);

    expect(parent.related_locations.sort()).toEqual([1, 2, 3]);
  });

  it('returns false when one cluster is inactive even if another is active', () => {
    const parentActive = createTag({ id: 1, visibility: true, dependenciesActive: true });
    const parentInactive = createTag({ id: 2, visibility: false, dependenciesActive: true });
    const child = createTag({
      id: 3,
      parent_tags: [
        { id: 1, parent_tag: 1, child_tag: 3, cluster_id: 1 },
        { id: 2, parent_tag: 2, child_tag: 3, cluster_id: 2 }
      ]
    });
    const tagsById = new Map<number, TagLike>([
      [1, parentActive],
      [2, parentInactive],
      [3, child]
    ]);

    expect(isAnyClusterActive(child, tagsById)).toBeFalse();
  });

  it('activates dependencies when every cluster has active parents', () => {
    const parentOne = createTag({ id: 1, visibility: true, dependenciesActive: true });
    const parentTwo = createTag({ id: 2, visibility: true, dependenciesActive: true });
    const child = createTag({
      id: 3,
      parent_tags: [
        { id: 1, parent_tag: 1, child_tag: 3, cluster_id: 1 },
        { id: 2, parent_tag: 2, child_tag: 3, cluster_id: 2 }
      ]
    });
    const tagsById = new Map<number, TagLike>([
      [1, parentOne],
      [2, parentTwo],
      [3, child]
    ]);

    expect(isAnyClusterActive(child, tagsById)).toBeTrue();
  });

  it('deactivates dependencies when every cluster is inactive', () => {
    const parentOne = createTag({ id: 1, visibility: false, dependenciesActive: true });
    const parentTwo = createTag({ id: 2, visibility: false, dependenciesActive: true });
    const child = createTag({
      id: 3,
      parent_tags: [
        { id: 1, parent_tag: 1, child_tag: 3, cluster_id: 1 },
        { id: 2, parent_tag: 2, child_tag: 3, cluster_id: 2 }
      ]
    });
    const tagsById = new Map<number, TagLike>([
      [1, parentOne],
      [2, parentTwo],
      [3, child]
    ]);

    expect(isAnyClusterActive(child, tagsById)).toBeFalse();
  });

  it('selects simultaneous menus in another menu group', () => {
    const menusById = new Map([
      [10, { id: 10, group: 5, hierarchy_level: 0 }]
    ]);
    const menuGroupsById = new Map([
      [5, { id: 5, name: 'Group B', simultaneous_context: true }]
    ]);
    const selectedMenusByGroup: Record<string, number> = {};

    expect(
      isMenuSimultaneousAndSelected(10, menusById, menuGroupsById, selectedMenusByGroup)
    ).toBeTrue();
    expect(selectedMenusByGroup['Group B']).toBe(10);
  });

  it('requires both locations to be on the map for non-simultaneous links', () => {
    const menusById = new Map([
      [1, { id: 1, group: 1, hierarchy_level: 0 }]
    ]);
    const menuGroupsById = new Map([
      [1, { id: 1, name: 'Group A', simultaneous_context: false }]
    ]);
    const selectedMenusByGroup = { 'Group A': 1 };

    expect(
      isLinkEligible(
        { id: 1, location_1: 1, location_2: 2, links_group: 1 },
        { id: 1, parent_menu: 1 },
        1,
        { id: 1, onMap: true },
        { id: 2, onMap: false },
        menusById,
        menuGroupsById,
        selectedMenusByGroup
      )
    ).toBeFalse();

    expect(
      isLinkEligible(
        { id: 1, location_1: 1, location_2: 2, links_group: 1 },
        { id: 1, parent_menu: 1 },
        1,
        { id: 1, onMap: true },
        { id: 2, onMap: true },
        menusById,
        menuGroupsById,
        selectedMenusByGroup
      )
    ).toBeTrue();
  });
});
