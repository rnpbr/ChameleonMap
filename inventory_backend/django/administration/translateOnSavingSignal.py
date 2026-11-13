import logging
import threading
from contextlib import nullcontext

from django.contrib.contenttypes.models import ContentType
from django.db import connection, transaction
from django.db.models.signals import post_save

from administration.map_data.cache import invalidate_map_data_cache
from administration.models import Map_configuration, NameTranslation
from tools.views import TRANSLATABLE_MODELS, createTitleTranslation

logger = logging.getLogger(__name__)


def translatingOnSaving(sender, instance, created, raw=False, **kwargs):
    if not created or raw or not getattr(instance, 'translatable', True):
        return
    tenant = getattr(connection, 'tenant', None)
    # After commit, so the admin save never waits on the translator and inline translations already exist
    transaction.on_commit(
        lambda: threading.Thread(target=_translateElement, args=(instance, tenant), daemon=True).start()
    )


def _tenantContext(tenant):
    if tenant is None:
        return nullcontext()
    from django_tenants.utils import tenant_context
    return tenant_context(tenant)


def _translateElement(instance, tenant):
    try:
        with _tenantContext(tenant):
            settings = Map_configuration.objects.first()
            if settings is None:
                return

            existingLanguages = set(
                NameTranslation.objects.filter(
                    content_type=ContentType.objects.get_for_model(instance), object_id=instance.id
                ).values_list('language_code', flat=True)
            )
            translated = False
            for language in settings.automatic_translation_languages.all():
                if language.code in existingLanguages or language.code == settings.default_content_language:
                    continue
                try:
                    translated |= createTitleTranslation(
                        element=instance,
                        sourceLanguageCode=settings.default_content_language,
                        targetLanguageCode=language.code,
                    )
                except Exception:
                    logger.warning("Automatic translation to '%s' failed for %r", language.code, instance, exc_info=True)

            # NameTranslation saves don't trigger the map data cache signals
            if translated:
                invalidate_map_data_cache()
    except Exception:
        logger.exception("Automatic translation failed for %r", instance)
    finally:
        connection.close()


def connect_translation_signals():
    for model in TRANSLATABLE_MODELS:
        post_save.connect(translatingOnSaving, sender=model, dispatch_uid=f'translate_on_save_{model.__name__}')
