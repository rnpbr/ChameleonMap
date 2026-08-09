from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static

from utils.password_reset_urls import password_reset_patterns

admin.site.site_header = 'Map Administration'

urlpatterns = [
    path('admin/', admin.site.urls),
    *password_reset_patterns,
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
