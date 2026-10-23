from django.db import models

from administration.models_constraints import StringConstraints


class LanguageOption(models.Model):
    code = models.CharField(max_length=StringConstraints.LANGUAGE_CODE_2_SIZE)
    name = models.CharField(max_length=StringConstraints.LANGUAGE_NAME_SIZE)

    class Meta:
        db_table = 'language_option'
        verbose_name_plural = "Language Options"

    def __str__(self):
        return self.name
