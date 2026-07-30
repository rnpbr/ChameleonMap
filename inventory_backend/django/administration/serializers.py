from rest_framework import serializers
from .models import *

class TranslatableTitleElement:
    def get_translations(self, obj):
        content_type = ContentType.objects.get_for_model(obj)
        querrySet = NameTranslation.objects.filter(
            content_type = content_type,
            object_id = obj.id
        )        
        return TitleTranslationSerializer(querrySet, many=True).data
    
class TitleTranslationSerializer(serializers.ModelSerializer):
    class Meta:
        model = NameTranslation
        fields = ['language_code', 'name']
        
class MenuGroupSerializer(TranslatableTitleElement, serializers.ModelSerializer):
    translations = serializers.SerializerMethodField()
        
    class Meta:
        model = MenuGroup
        fields = ['id', 'name', 'simultaneous_context', 'translations']
        
class MenuSerializer(TranslatableTitleElement, serializers.ModelSerializer):
    translations = serializers.SerializerMethodField()
                
    class Meta:
        model = Menu
        fields = ['id', 'name', 'group', 'hierarchy_level', 'active', 'translations']

class TagSerializer(TranslatableTitleElement, serializers.ModelSerializer):
    translations = serializers.SerializerMethodField()

    class Meta:
        model = Tag
        fields = ['id', 'name', 'description', 'color', 'active', 'parent_menu', 'related_locations', 'sidebar_content', 'overlayed_popup_content', 'translations']

class LocationSerializer(TranslatableTitleElement, serializers.ModelSerializer):
    translations = serializers.SerializerMethodField()
        
    class Meta:
        model = Location
        fields = ['id', 'name', 'description', 'latitude', 'longitude', 'overlayed_popup_content', 'active', 'translations']

class Tag_relationshipSerializer(serializers.ModelSerializer):

    class Meta:
        model = Tag_relationship
        fields = '__all__'

class LinkSerializer(TranslatableTitleElement, serializers.ModelSerializer):
    translations = serializers.SerializerMethodField()
        
    class Meta:
        model = Link
        fields = ['id', 'display_name', 'popup_description', 'curvature', 'weight', 'dashed', 'straight_link', 'location_1', 'location_2', 'links_group', 'invert_link', 'translations']

class Links_groupSerializer(TranslatableTitleElement, serializers.ModelSerializer):
    translations = serializers.SerializerMethodField()
        
    class Meta:
        model = Links_group
        fields = ['id', 'name', 'links_color', 'opacity', 'sidebar_content', 'parent_menu', 'translations']

class Kml_shapeSerializer(serializers.ModelSerializer):
    kml_file = serializers.SerializerMethodField()

class Kml_shapeSerializer(TranslatableTitleElement, serializers.ModelSerializer):
    translations = serializers.SerializerMethodField()
        
    class Meta:
        model = Kml_shape
        fields = ['id', 'name', 'parent_menu', 'links_color', 'opacity', 'kml_file', 'translations']

    def get_kml_file(self, obj):
        if obj.kml_file:
            # Returns only the relative path
            return obj.kml_file.url  
        return None

class Map_configurationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Map_configuration
        fields = '__all__'
