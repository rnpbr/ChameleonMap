from unfold.admin import ModelAdmin as BaseModelAdmin
from administration.admin_inlines import NameTranslationInline

class TranslatableModelAdmin(BaseModelAdmin):
    inlines = []

    def get_inlines(self, request, obj=None):
        return self.inlines + [NameTranslationInline]
    
    class Media():
        js = ('admin/js/conditional_translation_inlines.js',) 
    