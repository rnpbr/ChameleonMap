from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline
from administration.models import *

class Tag_relationshipInline(admin.TabularInline):
    model = Tag_relationship
    fk_name = "child_tag"
    search_fields = ['name']
    
class NameTranslationInline(GenericTabularInline):
    model = NameTranslation
    extra = 0
    fields = ['language_code', 'name']
    collapsible = True
    class Media:
        js = ('admin/js/autofill-translation.js',)

    def get_formset(self, request, obj=None, **kwargs):
        formset_class = super().get_formset(request, obj, **kwargs)

        if obj is not None:
            existing_langs = set(
                NameTranslation.objects.filter(
                    content_type=ContentType.objects.get_for_model(obj),
                    object_id=obj.pk
                ).values_list('language_code', flat=True)
            )
            
            default_language = Map_configuration.objects.first().default_content_language
            all_choices = list(LanguageCode.choices)
            available_choices = [
                (code, label)
                for code, label in all_choices
                if code not in existing_langs and code != default_language
            ]

            OriginalForm = formset_class.form

            class PatchedForm(OriginalForm):
                def __init__(self_form, *args, **kwargs):
                    super().__init__(*args, **kwargs)
                    if not self_form.instance.pk:
                        self_form.fields['language_code'].choices = [('', '---------')] + available_choices
                        self_form.fields['language_code'].initial = ''
            formset_class.form = PatchedForm

        return formset_class 
    