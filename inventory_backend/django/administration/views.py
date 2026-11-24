from .models import *
from .serializers import *
from rest_framework import viewsets
from django.http import JsonResponse
from .runtime_data import build_runtime_payload


def runtime_map_data(request):
    return JsonResponse(build_runtime_payload())


class ReadOnlyViewSet(viewsets.ReadOnlyModelViewSet):
    http_method_names = ['get']

class MenuGroupViewSet(ReadOnlyViewSet):
    serializer_class = MenuGroupSerializer
    queryset = MenuGroup.objects.all()

class MenuViewSet(ReadOnlyViewSet):
    serializer_class = MenuSerializer
    queryset = Menu.objects.all()

class TagViewSet(ReadOnlyViewSet):
    serializer_class = TagSerializer
    queryset = Tag.objects.all()

class LocationViewSet(ReadOnlyViewSet):
    serializer_class = LocationSerializer
    queryset = Location.objects.all()

class LinkViewSet(ReadOnlyViewSet):
    serializer_class = LinkSerializer
    queryset = Link.objects.all()

class Links_groupViewSet(ReadOnlyViewSet):
    serializer_class = Links_groupSerializer
    queryset = Links_group.objects.all()

class Kml_shapeViewSet(ReadOnlyViewSet):
    serializer_class = Kml_shapeSerializer
    queryset = Kml_shape.objects.all()

class Tag_relationshipViewSet(ReadOnlyViewSet):
    serializer_class = Tag_relationshipSerializer
    queryset = Tag_relationship.objects.all()

class Map_configurationViewSet(ReadOnlyViewSet):
    serializer_class = Map_configurationSerializer
    queryset = Map_configuration.objects.all()
