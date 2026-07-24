from administration.models import *
from django.db import connection

saveLogs = {
    'success': [],
    'warnings': [],
    'errors': []
}

def clearLogs():
    saveLogs['success'] = []
    saveLogs['warnings'] = []
    saveLogs['errors'] = []

def createLog(logType, operation, elementName, elementId, modelText, error=None):
    if logType == 'success':
        saveLogs['success'].append("%s: %s record with name '%s' (id %d)." % (operation.capitalize(), modelText[:-1], elementName, elementId))
    elif logType == 'warnings':
        saveLogs['warnings'].append("The %s record with name '%s' (id %d) not applied." % (modelText[:-1], elementName, elementId))
    elif logType == 'errors':
        saveLogs['errors'].append("Unable to %s %s record with name '%s' (id %d). Error detail: %s" % (operation, modelText[:-1], elementName, elementId, str(error)))


def createStatusMessage():
    lenSuccess = len(saveLogs['success'])
    lenErros = len(saveLogs['errors'])
    lenWarnings = len(saveLogs['warnings'])

    if(lenErros == 0 and lenWarnings == 0):
        statusMsg = "%s Modifications done successfully!" % str(lenSuccess)
    else:
        statusMsg = "Modifications partially done. "
        if(lenErros != 0):
            statusMsg +=  str(lenErros) + " errors occurred. "
        if(lenWarnings != 0):
            statusMsg +=  str(lenWarnings) + " warnings occurred. "

    return statusMsg

def createRelationshipLog(logType, elementName, elementRelationid):
    if logType == 'warnings':
        errorMsg = "Unable to add the relationship of tag '%s' with location of id '%s' because location of id '%s' could not be found." % (elementName, str(elementRelationid), str(elementRelationid))
        saveLogs['warnings'].append(errorMsg)
    elif logType == 'errors':
        errorMsg = "Unable to add the relationship of tag '%s' with menu of id '%s' because menu of id '%s' could not be found." % (elementName, str(elementRelationid), str(elementRelationid))
        saveLogs['errors'].append(errorMsg)


def isChangedRelatedLocation(oldRelatedLocation, newRelatedLocation):
    return set(oldRelatedLocation) != set(newRelatedLocation)

def createRelatedLocationsRecord(relatedLocationsId, tagName):
    relatedLocationsRecord = []

    for relatedLocationId in relatedLocationsId:
        try:
            relatedLocationsRecord.append(Location.objects.get(pk=relatedLocationId))
        except:
            createRelationshipLog('warnings', tagName, relatedLocationId)

    return relatedLocationsRecord

def addElement(element, modelText):
    try:
        if modelText == 'MenuGroups':
            newElement = MenuGroup(
                id=element['id'],
                name=element['name'],
                simultaneous_context=element.get('simultaneous_context', False)
            )
        elif modelText == 'Menus':
            newElement = Menu(
                id=element['id'],
                name=element['name'],
                hierarchy_level=element.get('hierarchy_level', 0),
                active=element.get('active', True),
            )
            if element.get('group'):
                try:
                    newElement.group = MenuGroup.objects.get(pk=element['group'])
                except MenuGroup.DoesNotExist:
                    pass
        elif modelText == 'Locations':
            newElement = Location(**element)
        elif modelText == 'Tags':
            newElement = Tag(
                id=element['id'],
                name=element['name'],
                color=element['color'],
                description=element['description'],
                sidebar_content=element['sidebar_content'],
                active=element['active']
            )
            try:
                newElement.parent_menu = Menu.objects.get(pk=element['parent_menu'])
            except Exception as error:
                createRelationshipLog('errors', element['name'], element['parent_menu'])
                raise Exception("error_displayed")

            newElement.save()
            newElement.related_locations.set(
                createRelatedLocationsRecord(element['related_locations'], element['name'])
            )
        elif modelText == 'LinksGroups':
            newElement = Links_group(
                id=element['id'],
                name=element['name'],
                links_color=element.get('links_color', '#FF0000'),
                opacity=element.get('opacity', 0.6),
            )
            if element.get('parent_menu'):
                try:
                    newElement.parent_menu = Menu.objects.get(pk=element['parent_menu'])
                except Menu.DoesNotExist:
                    pass
        elif modelText == 'Links':
            newElement = Link(
                id=element['id'],
                display_name=element['name'],
                curvature=element.get('curvature', 2.0),
                weight=element.get('weight', 3),
                dashed=element.get('dashed', False),
                straight_link=element.get('straight_link', False),
                invert_link=element.get('invert_link', False),
                popup_description=element.get('popup_description', ''),
            )
            try:
                newElement.location_1 = Location.objects.get(pk=element['location_1'])
                newElement.location_2 = Location.objects.get(pk=element['location_2'])
            except Location.DoesNotExist as error:
                createRelationshipLog('errors', element['name'], element.get('location_1'))
                raise Exception("error_displayed")
            if element.get('links_group'):
                try:
                    newElement.links_group = Links_group.objects.get(pk=element['links_group'])
                except Links_group.DoesNotExist:
                    pass
        else:
            raise Exception(f"Unknown model type: {modelText}")

        newElement.save()
    except Exception as error:
        if str(error) != "error_displayed":
            createLog('errors', 'add', element['name'], element['id'], modelText, error)
    else:
        createLog('success', 'added', element['name'], element['id'], modelText)


def removeElement(element, modelText):
    try:
        model_map = {
            'MenuGroups': MenuGroup,
            'Menus': Menu,
            'Locations': Location,
            'Tags': Tag,
            'LinksGroups': Links_group,
            'Links': Link,
        }
        model_class = model_map.get(modelText)
        if model_class is None:
            raise Exception(f"Unknown model type: {modelText}")
        recordElement = model_class.objects.get(pk=element['id'])
        recordElement.delete()
    except Exception as error:
        createLog('errors', 'remove', element['name'], element['id'], modelText, error)
    else:
        createLog('success', 'removed', element['name'], element['id'], modelText)

def editElement(element, modelText):
    try:
        if modelText == 'MenuGroups':
            record = MenuGroup.objects.get(pk=element['id'])
            record.simultaneous_context = element['simultaneous_context']['new']
            record.save()

        elif modelText == 'Menus':
            menuRecord = Menu.objects.get(pk=element['id'])
            menuRecord.hierarchy_level = element['hierarchy_level']['new']
            menuRecord.active = element['active']['new']
            if element.get('group') and element['group']['old'] != element['group']['new']:
                if element['group']['new']:
                    try:
                        menuRecord.group = MenuGroup.objects.get(pk=element['group']['new'])
                    except MenuGroup.DoesNotExist:
                        pass
                else:
                    menuRecord.group = None
            menuRecord.save()

        elif modelText == 'Locations':
            locationRecord = Location.objects.get(pk=element['id'])
            locationRecord.description = element['description']['new']
            locationRecord.latitude = element['latitude']['new']
            locationRecord.longitude = element['longitude']['new']
            locationRecord.active = element['active']['new']
            locationRecord.save()

        elif modelText == 'Tags':
            tagRecord = Tag.objects.get(pk=element['id'])
            tagRecord.color = element['color']['new']
            tagRecord.description = element['description']['new']
            tagRecord.sidebar_content = element['sidebar_content']['new']
            tagRecord.active = element['active']['new']

            if element['parent_menu']['old'] != element['parent_menu']['new']:
                tagRecord.parent_menu = Menu.objects.get(pk=element['parent_menu']['new'])

            if isChangedRelatedLocation(element['related_locations']['old'], element['related_locations']['new']):
                tagRecord.related_locations.set(
                    createRelatedLocationsRecord(element['related_locations']['new'], element['name'])
                )

            tagRecord.save()

        elif modelText == 'LinksGroups':
            record = Links_group.objects.get(pk=element['id'])
            record.links_color = element['links_color']['new']
            record.opacity = element['opacity']['new']
            if element['parent_menu']['old'] != element['parent_menu']['new']:
                if element['parent_menu']['new']:
                    try:
                        record.parent_menu = Menu.objects.get(pk=element['parent_menu']['new'])
                    except Menu.DoesNotExist:
                        pass
                else:
                    record.parent_menu = None
            record.save()

        elif modelText == 'Links':
            record = Link.objects.get(pk=element['id'])
            record.curvature = element['curvature']['new']
            record.weight = element['weight']['new']
            record.dashed = element['dashed']['new']
            record.straight_link = element['straight_link']['new']
            record.invert_link = element['invert_link']['new']
            record.popup_description = element['popup_description']['new']

            if element['location_1']['old'] != element['location_1']['new']:
                record.location_1 = Location.objects.get(pk=element['location_1']['new'])
            if element['location_2']['old'] != element['location_2']['new']:
                record.location_2 = Location.objects.get(pk=element['location_2']['new'])
            if element['links_group']['old'] != element['links_group']['new']:
                if element['links_group']['new']:
                    try:
                        record.links_group = Links_group.objects.get(pk=element['links_group']['new'])
                    except Links_group.DoesNotExist:
                        pass
                else:
                    record.links_group = None
            record.save()

    except Exception as error:
        createLog('errors', 'edit', element['name'], element['id'], modelText, error)
    else:
        createLog('success', 'edited', element['name'], element['id'], modelText)


def _reset_seq(cursor, table_name, current_max):
    cursor.execute(
        "SELECT setval(pg_get_serial_sequence(%s, 'id'), %s, true)",
        [table_name, current_max]
    )


def updateDBSeqId():
    cursor = connection.cursor()

    seq_models = [
        (MenuGroup, 'menugroup'),
        (Menu, 'menu'),
        (Location, 'location'),
        (Tag, 'tag'),
        (Links_group, 'links_group'),
        (Link, 'link'),
    ]

    for model_class, table_name in seq_models:
        try:
            max_id = model_class.objects.latest('pk').pk
            _reset_seq(cursor, table_name, max_id)
        except model_class.DoesNotExist:
            pass


def execute(request):
    clearLogs()
    dataApplies = request.POST.items()
    mapData = request.session.get('importedData')
    selectedChanges = {}

    for key, value in dataApplies:
        if value == "on":
            selectedChanges[key] = True

    # Dependency order for adds; reverse order ensures safe removes too
    modelsList = ['MenuGroups', 'Menus', 'Locations', 'Tags', 'LinksGroups', 'Links']
    operationList = ['added', 'edited', 'removed']

    for model in modelsList:
        if model not in mapData:
            continue
        for operation in operationList:
            for element in mapData[model][operation]:
                selectedChangeKey = model + "-" + str(element['id'])
                try:
                    if selectedChanges[selectedChangeKey]:
                        if operation == 'added':
                            addElement(element, model)
                        elif operation == 'edited':
                            editElement(element, model)
                        elif operation == 'removed':
                            removeElement(element, model)
                        else:
                            saveLogs['errors'].append(
                                "Unknown operation '%s' for model '%s'." % (operation, model)
                            )
                except Exception as warning:
                    createLog('warnings', None, element['name'], element['id'], model, warning)

    statusMsg = createStatusMessage()
    saveLogs['success'].sort()

    updateDBSeqId()

    return {'status': statusMsg, 'logs': saveLogs}
