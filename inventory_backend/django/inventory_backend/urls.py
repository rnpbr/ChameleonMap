from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from django.utils.translation import gettext_lazy as _

from utils.password_reset_urls import password_reset_patterns

admin.site.site_header = _('Map Administration')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('i18n/', include('django.conf.urls.i18n')),
    *password_reset_patterns,
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
