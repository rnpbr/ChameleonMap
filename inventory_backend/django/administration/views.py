from .models import *
from .serializers import *
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response

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

class ListLanguageOptions(APIView):
    http_method_names = ['get']

    def get(self, request):
        defaultLanguage = (
            Map_configuration.objects
            .values_list('default_content_language', flat=True)
            .first()
        )
        
        languageOptions = list(
            NameTranslation.objects
            .values_list("language_code", flat=True)
            .distinct()
        )
        
        if defaultLanguage and defaultLanguage not in languageOptions:
            languageOptions.insert(0, defaultLanguage)
        elif defaultLanguage and defaultLanguage in languageOptions:
            languageOptions.remove(defaultLanguage)
            languageOptions.insert(0, defaultLanguage)
            
        return Response({"languageOptions": languageOptions})