from administration.models import *
from django.core import serializers
import json
from importer.models import *

# Serialize from query object to python object
def serial(input):
    string = serializers.serialize('json', [ input, ])
    obj = json.loads(string)
    obj[0]["fields"]["id"] = obj[0]["pk"]
    return obj[0]["fields"]

def requestAll(storedData):
    # MenuGroup request
    for storedMenuGroup in list(MenuGroup.objects.all()):
        mg = serial(storedMenuGroup)
        storedData.menu_groups.append(MenuGroupsType(mg['id'], mg['name'], mg['simultaneous_context']))
    # Menu request
    for storedMenu in list(Menu.objects.all()):
        menu = serial(storedMenu)
        storedData.menus.append(MenusType(menu['id'], menu['name'], menu['group'], menu['hierarchy_level'], menu['active']))
    # Location request
    for storedLocation in list(Location.objects.all()):
        location = serial(storedLocation)
        storedData.locations.append(LocationsType(location['id'], location['name'], location['description'], location['latitude'], location['longitude'], location['active']))
    # Tag request
    for storedTag in list(Tag.objects.all()):
        tag = serial(storedTag)
        storedData.tags.append(TagsType(tag['id'], tag['name'], tag['parent_menu'], tag['color'].lower(), tag['description'], tag['sidebar_content'], tag['related_locations'], tag['active']))
    # LinksGroup request
    for storedLinksGroup in list(Links_group.objects.all()):
        lg = serial(storedLinksGroup)
        storedData.links_groups.append(LinksGroupsType(lg['id'], lg['name'], lg['parent_menu'], lg['links_color'], lg['opacity']))
    # Link request
    for storedLink in list(Link.objects.all()):
        link = serial(storedLink)
        storedData.links.append(LinksType(
            link['id'], link['display_name'],
            link['location_1'], link['location_2'], link['links_group'],
            link['curvature'], link['weight'], link['dashed'],
            link['straight_link'], link['invert_link'],
            link.get('popup_description', '')
        ))

    return storedData

def isMenuEqual(menu1, menu2):
    return (menu1.name == menu2.name and menu1.group == menu2.group
            and menu1.hierarchy_level == menu2.hierarchy_level and menu1.active == menu2.active)

def filterMenus(importedData, storedData, menusDiff):
    #added/edited menus
    menusToBeRemoved = []
    for importedMenu in importedData.menus:
        found = False
        for storedMenu in storedData.menus:
            if (importedMenu.name == storedMenu.name):
                found = True
                if (not isMenuEqual(importedMenu, storedMenu)):
                    newEditedMenu = EditedMenusType(storedMenu, importedMenu)
                    menusDiff.edited.append(newEditedMenu)
                if(storedMenu not in menusToBeRemoved):
                    menusToBeRemoved.append(storedMenu)
        if(not found):
            menusDiff.added.append(importedMenu)
    
    for menu in menusToBeRemoved:
        storedData.menus.remove(menu)

    # menus which still lasted are removed menus
    for menu in storedData.menus:
        menusDiff.removed.append((menu))

    return storedData, menusDiff

def isLocationEqual(location1, location2):
    DELTA_MAX = 0.000001 # latitude/longitude values below delta are not considered 

    if(location1.name == location2.name):
        lat_delta = abs(float(location1.latitude) - float(location2.latitude))
        if(lat_delta <= DELTA_MAX):
            long_delta = abs(float(location1.longitude) - float(location2.longitude))
            if(long_delta <= DELTA_MAX):
                if(location1.description == location2.description):
                    return True
    return False

def filterLocations(importedData, storedData, locationsDiff):
    #added/edited locations
    locationsToBeRemoved = []
    for importedLocation in importedData.locations:
        found = False
        for storedLocation in storedData.locations:
            if (importedLocation.name == storedLocation.name):
                found = True
                if (not isLocationEqual(importedLocation, storedLocation)):
                    newEditedLocation = EditedLocationsType(storedLocation, importedLocation)
                    locationsDiff.edited.append(newEditedLocation)
                if(storedLocation not in locationsToBeRemoved):
                    locationsToBeRemoved.append(storedLocation)
        if(not found):
            locationsDiff.added.append(importedLocation)
    
    for location in locationsToBeRemoved:
        storedData.locations.remove(location)

    # locations which still lasted are removed locations
    for location in storedData.locations:
        locationsDiff.removed.append((location))

    return storedData, locationsDiff

def isTagEqual(tag1, tag2):
    #NOT CONSIDERING SIDEBARCONTENT
    if(tag1.name == tag2.name):
        if(set(tag1.related_locations) == set(tag2.related_locations)):
            if(tag1.parent_menu == tag2.parent_menu):
                if(tag1.color == tag2.color):
                    if(tag1.description == tag2.description): 
                        return True
    return False

def filterTags(importedData, storedData, tagsDiff):      # Padronizar com Menus
    #added/edited tags
    tagsToBeRemoved = []
    for importedTag in importedData.tags:
        found = False
        for storedTag in storedData.tags:
            if (importedTag.name == storedTag.name):
                found = True
                if (not isTagEqual(importedTag, storedTag)):
                    newEditedTag = EditedTagsType(storedTag, importedTag)
                    importedTag.related_locations.sort()
                    storedTag.related_locations.sort()
                    tagsDiff.edited.append(newEditedTag)
                if(storedTag not in tagsToBeRemoved):
                    tagsToBeRemoved.append(storedTag)
        if(not found):
            tagsDiff.added.append(importedTag)
    
    for tag in tagsToBeRemoved:
        storedData.tags.remove(tag)

    # tags which still lasted are removed tags
    for tag in storedData.tags:
        tagsDiff.removed.append((tag))

    return storedData, tagsDiff


def isMenuGroupEqual(mg1, mg2):
    return mg1.name == mg2.name and mg1.simultaneous_context == mg2.simultaneous_context


def filterMenuGroups(importedData, storedData, menuGroupsDiff):
    toRemove = []
    for imported in importedData.menu_groups:
        found = False
        for stored in storedData.menu_groups:
            if imported.name == stored.name:
                found = True
                if not isMenuGroupEqual(imported, stored):
                    menuGroupsDiff.edited.append(EditedMenuGroupsType(stored, imported))
                if stored not in toRemove:
                    toRemove.append(stored)
        if not found:
            menuGroupsDiff.added.append(imported)
    for mg in toRemove:
        storedData.menu_groups.remove(mg)
    for mg in storedData.menu_groups:
        menuGroupsDiff.removed.append(mg)
    return storedData, menuGroupsDiff


def isLinksGroupEqual(lg1, lg2):
    return (lg1.name == lg2.name and lg1.parent_menu == lg2.parent_menu
            and lg1.links_color == lg2.links_color and float(lg1.opacity) == float(lg2.opacity))


def filterLinksGroups(importedData, storedData, linksGroupsDiff):
    toRemove = []
    for imported in importedData.links_groups:
        found = False
        for stored in storedData.links_groups:
            if imported.name == stored.name:
                found = True
                if not isLinksGroupEqual(imported, stored):
                    linksGroupsDiff.edited.append(EditedLinksGroupsType(stored, imported))
                if stored not in toRemove:
                    toRemove.append(stored)
        if not found:
            linksGroupsDiff.added.append(imported)
    for lg in toRemove:
        storedData.links_groups.remove(lg)
    for lg in storedData.links_groups:
        linksGroupsDiff.removed.append(lg)
    return storedData, linksGroupsDiff


def isLinkEqual(l1, l2):
    return (l1.name == l2.name and l1.location_1 == l2.location_1
            and l1.location_2 == l2.location_2 and l1.links_group == l2.links_group
            and float(l1.curvature) == float(l2.curvature) and l1.weight == l2.weight
            and l1.dashed == l2.dashed and l1.straight_link == l2.straight_link
            and l1.invert_link == l2.invert_link)


def filterLinks(importedData, storedData, linksDiff):
    toRemove = []
    for imported in importedData.links:
        found = False
        for stored in storedData.links:
            if imported.name == stored.name:
                found = True
                if not isLinkEqual(imported, stored):
                    linksDiff.edited.append(EditedLinksType(stored, imported))
                if stored not in toRemove:
                    toRemove.append(stored)
        if not found:
            linksDiff.added.append(imported)
    for link in toRemove:
        storedData.links.remove(link)
    for link in storedData.links:
        linksDiff.removed.append(link)
    return storedData, linksDiff


def createMapDataDiff(menuGroupsDiff, menusDiff, locationsDiff, tagsDiff, linksGroupsDiff, linksDiff):
    diff_map = {
        'MenuGroups': json.loads(menuGroupsDiff.toJSON()),
        'Menus': json.loads(menusDiff.toJSON()),
        'Locations': json.loads(locationsDiff.toJSON()),
        'Tags': json.loads(tagsDiff.toJSON()),
        'LinksGroups': json.loads(linksGroupsDiff.toJSON()),
        'Links': json.loads(linksDiff.toJSON()),
    }

    operationList = ['added', 'edited', 'removed']
    numberChanges = 0
    for model_diff in diff_map.values():
        for operation in operationList:
            if len(model_diff[operation]) > 0:
                numberChanges += 1

    if numberChanges == 0:
        return None

    return diff_map


def run(mapData):
    storedData = StoredDataType()
    menuGroupsDiff = MapDataDiff()
    menusDiff = MapDataDiff()
    locationsDiff = MapDataDiff()
    tagsDiff = MapDataDiff()
    linksGroupsDiff = MapDataDiff()
    linksDiff = MapDataDiff()

    storedData = requestAll(storedData)

    # Dependency order: groups before menus, menus/locations before tags, etc.
    storedData, menuGroupsDiff = filterMenuGroups(mapData, storedData, menuGroupsDiff)
    storedData, menusDiff = filterMenus(mapData, storedData, menusDiff)
    storedData, locationsDiff = filterLocations(mapData, storedData, locationsDiff)
    storedData, tagsDiff = filterTags(mapData, storedData, tagsDiff)
    storedData, linksGroupsDiff = filterLinksGroups(mapData, storedData, linksGroupsDiff)
    storedData, linksDiff = filterLinks(mapData, storedData, linksDiff)

    return createMapDataDiff(menuGroupsDiff, menusDiff, locationsDiff, tagsDiff, linksGroupsDiff, linksDiff)
