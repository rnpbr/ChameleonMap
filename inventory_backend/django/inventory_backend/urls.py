from django.contrib import admin
from django.urls import include, path
from rest_framework import routers
from administration.views import *
from django.conf import settings
from django.conf.urls.static import static
from administration.views import runtime_map_data

admin.site.site_header = 'Map Administration'

router = routers.DefaultRouter()
router.register(
    'menugroup', MenuGroupViewSet
)

router.register(
    'menu', MenuViewSet
)
router.register(
    'tag', TagViewSet
)
router.register(
    'location', LocationViewSet
)
router.register(
    'link', LinkViewSet
)
router.register(
    'linksgroup', Links_groupViewSet
)
router.register(
    'kmlshape', Kml_shapeViewSet
)
router.register(
    'tagrelationship', Tag_relationshipViewSet
)
router.register(
    'settings', Map_configurationViewSet
)


urlpatterns = [
    path('admin/', admin.site.urls),
    path('runtime-map-data/', runtime_map_data),
    path('api-auth/', include('rest_framework.urls')),
    path('', include(router.urls)),
    path('import/', include("importer.urls")),
    path('atlas/', include("atlas_builder.urls"))
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)