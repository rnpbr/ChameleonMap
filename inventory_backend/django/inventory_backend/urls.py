from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from django.utils.translation import gettext_lazy as _
from django.conf.urls.i18n import i18n_patterns

from utils.password_reset_urls import password_reset_patterns

admin.site.site_header = _('Map Administration')

urlpatterns = (
    [
        path('admin/', admin.site.urls),
        path('i18n/', include('django.conf.urls.i18n')),
        *password_reset_patterns,
    ]
)

if not settings.ENABLE_MULTITENANT:
    from rest_framework import routers
    from administration.views import (
        MenuGroupViewSet,
        MenuViewSet,
        TagViewSet,
        LocationViewSet,
        LinkViewSet,
        Links_groupViewSet,
        Kml_shapeViewSet,
        Tag_relationshipViewSet,
        Map_configurationViewSet,
    )
    from administration.map_data.views import MapDataAPIView

    router = routers.DefaultRouter()
    router.register('menugroup', MenuGroupViewSet)
    router.register('menu', MenuViewSet)
    router.register('tag', TagViewSet)
    router.register('location', LocationViewSet)
    router.register('link', LinkViewSet)
    router.register('linksgroup', Links_groupViewSet)
    router.register('kmlshape', Kml_shapeViewSet)
    router.register('tagrelationship', Tag_relationshipViewSet)
    router.register('settings', Map_configurationViewSet)

    urlpatterns = [
        path('admin/', admin.site.urls),
        path('i18n/', include('django.conf.urls.i18n')),
        path('api-auth/', include('rest_framework.urls')),
        path('map-data/', MapDataAPIView.as_view()),
        path('', include(router.urls)),
        path('import/', include("importer.urls")),
        path('atlas/', include("atlas_builder.urls")),
        *password_reset_patterns,
    ]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
