from rest_framework import serializers
from .models import *

class MenuGroupSerializer(serializers.ModelSerializer):

    class Meta:
        model = MenuGroup
        fields = '__all__'

class MenuSerializer(serializers.ModelSerializer):

    class Meta:
        model = Menu
        fields = '__all__'

class TagSerializer(serializers.ModelSerializer):

    class Meta:
        model = Tag
        fields = ['id', 'name', 'description', 'color', 'active', 'parent_menu', 'related_locations', 'sidebar_content', 'overlayed_popup_content']

class LocationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Location
        fields = '__all__'

class Tag_relationshipSerializer(serializers.ModelSerializer):

    class Meta:
        model = Tag_relationship
        fields = '__all__'

class LinkSerializer(serializers.ModelSerializer):

    class Meta:
        model = Link
        fields = '__all__'

class Links_groupSerializer(serializers.ModelSerializer):

    class Meta:
        model = Links_group
        fields = '__all__'

class Kml_shapeSerializer(serializers.ModelSerializer):
    kml_file = serializers.SerializerMethodField()

    class Meta:
        model = Kml_shape
        fields = '__all__'

    def get_kml_file(self, obj):
        if obj.kml_file:
            return obj.kml_file.url
        return None

class Map_configurationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Map_configuration
        fields = '__all__'