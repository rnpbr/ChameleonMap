from django.urls import path
from .views import index, netbox, replace, csv_upload

urlpatterns = [
    path('', index),
    path('netbox/', netbox),
    path('replace/', replace),
    path('csv/', csv_upload),
]
