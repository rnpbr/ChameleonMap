"""Port of map-frontend map-behavior inherited location resolution."""


def is_indirect_child(tag, child_tag, menus_by_id):
    is_direct_child = any(
        relation['child_tag'] == child_tag['id'] for relation in tag['child_tags']
    )
    if is_direct_child:
        return False

    tag_menu = menus_by_id.get(tag['parent_menu'])
    child_menu = menus_by_id.get(child_tag['parent_menu'])
    if tag_menu and child_menu:
        return child_menu['hierarchy_level'] > tag_menu['hierarchy_level'] + 1
    return False


def resolve_inherited_locations(tag, iteration_tag, tags_by_id, menus_by_id):
    if not iteration_tag.get('child_tags'):
        return

    for child_relation in iteration_tag['child_tags']:
        child = tags_by_id.get(child_relation['child_tag'])
        if not child:
            continue

        if not is_indirect_child(tag, child, menus_by_id):
            tag['related_locations'].extend(child['related_locations'])
        else:
            cluster_ids = list({relation['cluster_id'] for relation in child['parent_tags']})
            related_menus = [
                tags_by_id[relation['parent_tag']]['parent_menu']
                for relation in child['parent_tags']
                if relation['parent_tag'] in tags_by_id
            ]
            if len(cluster_ids) == 1 or tag['parent_menu'] not in related_menus:
                tag['related_locations'].extend(child['related_locations'])

        for nested_relation in child.get('child_tags', []):
            nested_tag = tags_by_id.get(nested_relation['parent_tag'])
            if nested_tag:
                resolve_inherited_locations(tag, nested_tag, tags_by_id, menus_by_id)

    tag['related_locations'] = list(dict.fromkeys(tag['related_locations']))


def apply_inherited_locations(tags, menus_by_id, inherit_enabled):
    if not inherit_enabled:
        return

    tags_by_id = {tag['id']: tag for tag in tags}
    for tag in tags:
        if tag['active']:
            resolve_inherited_locations(tag, tag, tags_by_id, menus_by_id)
