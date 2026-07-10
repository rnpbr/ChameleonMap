from django.db import models
from django.db.models.deletion import SET_NULL
from django.core.validators import MaxValueValidator, MinValueValidator, FileExtensionValidator
from django.utils.translation import gettext_lazy as _
from colorfield.fields import ColorField
from tinymce.models import HTMLField
# from django import forms

class MenuGroup(models.Model):
    name = models.CharField(max_length=25)
    simultaneous_context = models.BooleanField(default=False, help_text=_("When checked, this menu group context will remain active even when other menu groups are selected."))

    class Meta:
        db_table = 'menugroup'
        verbose_name = _("Menu Group")
        verbose_name_plural = _("Menu Groups")

    def __str__(self):
        return self.name

class Menu(models.Model):
    name = models.CharField(max_length=2000)
    group = models.ForeignKey('MenuGroup', null=True, on_delete=models.SET_NULL, verbose_name=_("group"))
    hierarchy_level = models.IntegerField(default=0, verbose_name=_("hierarchy level"), help_text=_("Menus with the same number are considered siblings. Menus with lower numbers are considered parents of the ones with higher numbers. For example, a menu with the number 0 is considered parent of menus with the number 1."))
    active = models.BooleanField(default=True, verbose_name=_("active"))

    class Meta:
        db_table = 'menu'
        ordering = ['hierarchy_level']
        verbose_name = _("Menu")
        verbose_name_plural = _("Menus")

    def __str__(self):
        return self.name

class Tag(models.Model):
    name = models.CharField(max_length=2000)
    related_tags = models.ManyToManyField('Tag', blank=True, through='Tag_relationship', verbose_name=_("related tags"))
    related_locations = models.ManyToManyField('Location', blank=True, verbose_name=_("related locations"))
    parent_menu = models.ForeignKey('Menu', null=True, on_delete=models.SET_NULL, verbose_name=_("parent menu"))
    color = ColorField(default='#FF0000', verbose_name=_("color"))
    description = HTMLField(null=True, blank=SET_NULL, verbose_name=_("Popup content"))
    sidebar_content = HTMLField(help_text=_("<b style='font-size: 0.85rem'>* Leave blank to use default template</b>"), null=True, blank=SET_NULL, verbose_name=_("sidebar content"))
    overlayed_popup_content = HTMLField(help_text=_("<b style='font-size: 0.85rem'>* This text will be displayed on 'show more info' popup</b>"), null=True, blank=SET_NULL, verbose_name=_("overlayed popup content"))
    active = models.BooleanField(default=True, verbose_name=_("active"))

    class Meta:
        db_table = 'tag'
        ordering = ['name']
        verbose_name = _("Tag")
        verbose_name_plural = _("Tags")

    def __str__(self):
        return self.name

class Tag_relationship(models.Model):
    child_tag = models.ForeignKey('Tag', null=True, on_delete=models.CASCADE, related_name="child_tag", verbose_name=_("child tag"))
    parent_tag = models.ForeignKey('Tag', null=True, on_delete=models.CASCADE, related_name="parent_tag", verbose_name=_("parent tag"))
    cluster_id = models.IntegerField(null=True, blank=SET_NULL, default=1, verbose_name=_("cluster ID"),
        help_text=_("Tag clusters are group of parent tags from the tag. To a cluster id be active, all tags in that id must be active. The child tag will be active if at least one of the cluster ids is active."))

    class Meta:
        verbose_name = _("Tag to tag relation")
        verbose_name_plural = _("Tag to tag relationships")
        db_table = 'tag_relationship'
        ordering = ['child_tag']

    def __str__(self):
        return self.child_tag.name + '_' + self.parent_tag.name + '_relation'

class Location(models.Model):
    name = models.CharField(max_length=2000)
    description = HTMLField(null=True, blank=SET_NULL, verbose_name=_("description"))
    latitude = models.DecimalField(max_digits=24, decimal_places=20, verbose_name=_("latitude"), validators=[MinValueValidator(-90), MaxValueValidator(90)])
    longitude = models.DecimalField(max_digits=24, decimal_places=20, verbose_name=_("longitude"), validators=[MinValueValidator(-180), MaxValueValidator(180)])
    overlayed_popup_content = HTMLField(help_text=_("<b style='font-size: 0.85rem'>* This text will be displayed on 'show more info' popup</b>"), null=True, blank=SET_NULL, verbose_name=_("overlayed popup content"))
    active = models.BooleanField(default=True, verbose_name=_("active"))
    class Meta:
        db_table = 'location'
        ordering = ['name']
        verbose_name = _("Location")
        verbose_name_plural = _("Locations")

    def __str__(self):
        return self.name

class Kml_shape(models.Model):
    name = models.CharField(max_length=25)
    parent_menu = models.ForeignKey('Menu', null=True, on_delete=models.SET_NULL, verbose_name=_("parent menu"))
    links_color = ColorField(default='#FF0000', verbose_name=_("links color"))
    opacity = models.DecimalField(default=0.6, max_digits=4, decimal_places=3, validators=[MinValueValidator(0), MaxValueValidator(1)], verbose_name=_("opacity"), help_text=_("Opacity of the link. Min(0)-Max(1)"))
    kml_file = models.FileField(upload_to='uploads/', help_text=_("Upload a custom KML file (max 30Mb)."), verbose_name=_("KML file"), validators=[FileExtensionValidator(['kml'])])
    
    def user_directory_path(instance, filename):
        return 'assets/{1}'.format(filename)
    
    class Meta:
        ordering = ['name']
        verbose_name = _("KML Shape")
        verbose_name_plural = _("KML Shapes")
        db_table = 'kml_shapes'

class Links_group(models.Model):
    name = models.CharField(max_length=25)
    links_color = ColorField(default='#FF0000', verbose_name=_("links color"))
    opacity = models.DecimalField(default=0.6, max_digits=4, decimal_places=3, validators=[MinValueValidator(0), MaxValueValidator(1)], verbose_name=_("opacity"), help_text=_("Opacity of the link. Min(0)-Max(1)"))
    sidebar_content = HTMLField(null=True, blank=SET_NULL, verbose_name=_("sidebar content"))
    parent_menu = models.ForeignKey('Menu', null=True, on_delete=models.SET_NULL, verbose_name=_("parent menu"))
    class Meta:
        ordering = ['name']
        verbose_name = _("Links group")
        verbose_name_plural = _("Links groups")
        db_table = 'links_group'

    def __str__(self):
        return self.name

class Link(models.Model):
    display_name = models.CharField(max_length=25, verbose_name=_("display name"))
    popup_description = HTMLField(null=True, blank=SET_NULL, verbose_name=_("popup description"))
    curvature = models.DecimalField(default=2.0, max_digits=4, decimal_places=3, validators=[MinValueValidator(1), MaxValueValidator(4)],
    verbose_name=_("curvature"), help_text=_("This field controls how curved the link will appear in the front-end. The higher the number, the less the link will be curved. Min(1)-Max(4). Accept decimal values."))
    weight = models.IntegerField(null=True, default=3,
    verbose_name=_("weight"), help_text=_("This field controls the weight of the link line. The higher the number, the wider the line."))
    dashed = models.BooleanField(default=False, verbose_name=_("dashed"), help_text=_("This field, when active, will make the link stroke dashed."))
    straight_link = models.BooleanField(default=False, verbose_name=_("straight link"), help_text=_("This field, when active, will make the link line straight."))
    location_1 = models.ForeignKey('Location', null=True, on_delete=models.CASCADE, related_name="location_1", verbose_name=_("location 1"))
    location_2 = models.ForeignKey('Location', null=True, on_delete=models.CASCADE, related_name="location_2", verbose_name=_("location 2"))
    links_group = models.ForeignKey('Links_group', null=True, on_delete=models.SET_NULL, verbose_name=_("links group"))
    invert_link = models.BooleanField(default=False, verbose_name=_("invert link"), help_text=_("This field, when active, will invert the curvature of the link."))
    class Meta:
        db_table = 'link'
        verbose_name = _("Link")
        verbose_name_plural = _("Links")

class Map_configuration(models.Model):
    map_name = models.CharField(max_length=25, verbose_name=_("map name"))
    map_style = models.CharField(
        max_length=15,
        choices = [("d", _("Default (gray colored)")), ("b", _("Blue colored"))],
        default="Default (gray colored)",
        verbose_name=_("map style"),
    )
    inherit_children_tag_locations = models.BooleanField(
        default=False, 
        verbose_name=_("inherit children tag locations"),
        help_text=_("When this field is enabled, a tag that is parent from another tags will inherit all locations from the children that was not previously declared on the parent. If instead you want to manually declare the locations for all tags, we suggest to keep this field disabled."),
    )
    cluster_close_tags = models.BooleanField(
        default=True, 
        verbose_name=_("cluster close tags"),
        help_text=_("When this field is enabled, tags located very close to each other will be grouped in clusters."),
    )
    initial_zoom_level = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(13)], verbose_name=_("initial zoom level"), help_text=_("Please insert a value from 0 to 13 (max zoom)."))
    initial_latitude = models.DecimalField(max_digits=24, decimal_places=20, default=0.000, verbose_name=_("initial latitude"), validators=[MinValueValidator(-90), MaxValueValidator(90)])
    initial_longitude = models.DecimalField(max_digits=24, decimal_places=20, default=0.000, verbose_name=_("initial longitude"), validators=[MinValueValidator(-180), MaxValueValidator(180)])
    link_feature = models.BooleanField(
        default=False, 
        verbose_name=_("link feature"),
        help_text=_("When this field is enabled, the link feature will be displayed on the front-end."),
    )
    hide_menu_group_when_unique = models.BooleanField(
        default=True, 
        verbose_name=_("hide menu group when unique"),
        help_text=_("When there is only one Menu Group active, hide the menu groups tabs"),
    )

    footer_file = models.ImageField(upload_to='uploads/', blank=True, verbose_name=_("footer file"), help_text=_("Upload a custom footer file."))
    
    def user_directory_path(instance, filename):
        return 'assets/{1}'.format(filename)

    class Meta:
        verbose_name = _("Map Settings")
        verbose_name_plural = _("Map Settings")
        db_table = 'map_config'

    def __str__(self):
            return "'"+self.map_name + "' " + str(_("Map Settings"))
