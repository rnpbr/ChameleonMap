# Create your models here.
import json
        
class MapData:
    def __init__(self):
        self.tagRelatedTags = []
        self.tagRelatedLocations = []
        self.menu_groups = []
        self.menus = []
        self.locations = []
        self.tags = []
        self.links_groups = []
        self.links = []
    def toJSON(self):
        return json.dumps(self, default=lambda o: o.__dict__, sort_keys=True, indent=4)

class EditedDataDiff:
    def __init__(self, old, new):
        self.old = old
        self.new = new
    def toJSON(self):
        return json.dumps(self, default=lambda o: o.__dict__, sort_keys=True, indent=4)

class MapDataDiff:
    def __init__(self):
        self.added = []
        self.edited = []
        self.removed = []
    def toJSON(self):
        return json.dumps(self, default=lambda o: o.__dict__, sort_keys=True, indent=4)

class StoredDataType:
    def __init__(self):
        self.menu_groups = []
        self.menus = []
        self.locations = []
        self.tags = []
        self.links_groups = []
        self.links = []
    def toJSON(self):
        return json.dumps(self, default=lambda o: o.__dict__, sort_keys=True, indent=4)

class MenusType:
    def __init__(self, id, name, group, hierarchy_level, active):
        self.id = id
        self.name = name
        self.group = group  # FK to MenuGroup (id or None)
        self.hierarchy_level = hierarchy_level
        self.active = active
    def toJSON(self):
        return json.dumps(self, default=lambda o: o.__dict__, sort_keys=True, indent=4)

class LocationsType:
    def __init__(self, id, name, description, latitude, longitude, active):
        self.id = id
        self.name = name
        self.description = description
        self.latitude = latitude
        self.longitude = longitude
        self.active = active
    def toJSON(self):
        return json.dumps(self, default=lambda o: o.__dict__, sort_keys=True, indent=4)

class TagsType:
    def __init__(self, id, name, parent_menu, color, description, sidebar_content, related_locations, active):
        self.id = id
        self.name = name
        self.parent_menu = parent_menu
        self.color = color if color[0] == '#' else '#' + color
        self.description = description
        self.sidebar_content = sidebar_content
        self.related_locations = related_locations
        self.active = active
    def toJSON(self):
        return json.dumps(self, default=lambda o: o.__dict__, sort_keys=True, indent=4)

class EditedMenusType:
    def __init__(self, old, new):
        self.id = old.id
        self.name = old.name
        self.group = EditedDataDiff(old.group, new.group)
        self.hierarchy_level = EditedDataDiff(old.hierarchy_level, new.hierarchy_level)
        self.active = EditedDataDiff(old.active, new.active)
    def toJSON(self):
        return json.dumps(self, default=lambda o: o.__dict__, sort_keys=True, indent=4)

class EditedLocationsType:
    def __init__(self, old, new):
        self.id = old.id
        self.name = old.name
        self.description = EditedDataDiff(old.description, new.description)
        self.latitude = EditedDataDiff(old.latitude, new.latitude)
        self.longitude = EditedDataDiff(old.longitude, new.longitude)
        self.active = EditedDataDiff(old.active, new.active)
    def toJSON(self):
        return json.dumps(self, default=lambda o: o.__dict__, sort_keys=True, indent=4)

class EditedTagsType:
    def __init__(self, old, new):
        self.id = old.id
        self.name = old.name
        self.parent_menu = EditedDataDiff(old.parent_menu, new.parent_menu)
        self.color = EditedDataDiff(old.color if old.color[0] == '#' else '#' + old.color, new.color if new.color[0] == '#' else '#' + new.color)
        self.description = EditedDataDiff(old.description, new.description)
        self.sidebar_content = EditedDataDiff(old.sidebar_content, new.sidebar_content)
        self.related_locations = EditedDataDiff(old.related_locations, new.related_locations)
        self.active = EditedDataDiff(old.active, new.active)
    def toJSON(self):
        return json.dumps(self, default=lambda o: o.__dict__, sort_keys=True, indent=4)


class MenuGroupsType:
    def __init__(self, id, name, simultaneous_context):
        self.id = id
        self.name = name
        self.simultaneous_context = simultaneous_context
    def toJSON(self):
        return json.dumps(self, default=lambda o: o.__dict__, sort_keys=True, indent=4)


class LinksGroupsType:
    def __init__(self, id, name, parent_menu, links_color, opacity):
        self.id = id
        self.name = name
        self.parent_menu = parent_menu
        self.links_color = links_color if links_color and links_color[0] == '#' else '#' + (links_color or 'FF0000')
        self.opacity = opacity
    def toJSON(self):
        return json.dumps(self, default=lambda o: o.__dict__, sort_keys=True, indent=4)


class LinksType:
    def __init__(self, id, name, location_1, location_2, links_group, curvature, weight, dashed, straight_link, invert_link, popup_description):
        self.id = id
        self.name = name
        self.location_1 = location_1
        self.location_2 = location_2
        self.links_group = links_group
        self.curvature = curvature
        self.weight = weight
        self.dashed = dashed
        self.straight_link = straight_link
        self.invert_link = invert_link
        self.popup_description = popup_description
    def toJSON(self):
        return json.dumps(self, default=lambda o: o.__dict__, sort_keys=True, indent=4)


class EditedMenuGroupsType:
    def __init__(self, old, new):
        self.id = old.id
        self.name = old.name
        self.simultaneous_context = EditedDataDiff(old.simultaneous_context, new.simultaneous_context)
    def toJSON(self):
        return json.dumps(self, default=lambda o: o.__dict__, sort_keys=True, indent=4)


class EditedLinksGroupsType:
    def __init__(self, old, new):
        self.id = old.id
        self.name = old.name
        self.parent_menu = EditedDataDiff(old.parent_menu, new.parent_menu)
        self.links_color = EditedDataDiff(old.links_color, new.links_color)
        self.opacity = EditedDataDiff(old.opacity, new.opacity)
    def toJSON(self):
        return json.dumps(self, default=lambda o: o.__dict__, sort_keys=True, indent=4)


class EditedLinksType:
    def __init__(self, old, new):
        self.id = old.id
        self.name = old.name
        self.location_1 = EditedDataDiff(old.location_1, new.location_1)
        self.location_2 = EditedDataDiff(old.location_2, new.location_2)
        self.links_group = EditedDataDiff(old.links_group, new.links_group)
        self.curvature = EditedDataDiff(old.curvature, new.curvature)
        self.weight = EditedDataDiff(old.weight, new.weight)
        self.dashed = EditedDataDiff(old.dashed, new.dashed)
        self.straight_link = EditedDataDiff(old.straight_link, new.straight_link)
        self.invert_link = EditedDataDiff(old.invert_link, new.invert_link)
        self.popup_description = EditedDataDiff(old.popup_description, new.popup_description)
    def toJSON(self):
        return json.dumps(self, default=lambda o: o.__dict__, sort_keys=True, indent=4)