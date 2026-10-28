from django.urls import path
from . import views

urlpatterns = [
    path("translate-text/", views.translate_text_api, name="translate-text")
]
