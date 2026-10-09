from django.db import migrations
from administration.language_codes import LanguageCode


def populate_language_options(apps, schema_editor):
    LanguageOption = apps.get_model('languages', 'LanguageOption')
    for code, name in LanguageCode.choices:
        LanguageOption.objects.get_or_create(code=code, defaults={"name": name})


class Migration(migrations.Migration):

    dependencies = [
        ('languages', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(populate_language_options),
    ]
