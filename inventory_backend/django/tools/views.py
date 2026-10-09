from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
import requests, json
from administration.models import *
from administration.map_data.cache import invalidate_map_data_cache
from django.views.decorators.csrf import csrf_exempt
import re

TRANSLATOR_URL = 'http://translator:5005/translate'
TRANSLATABLE_MODELS = [Menu, MenuGroup, Tag, Links_group, Link, Location, Kml_shape]
TRANSLATION_BATCH_SIZE = 50
TRANSLATION_BATCH_MAX_CHARS = 4000

# def translateText2(request):
#     createTranslationsForAllTitles('ko')
#     return HttpResponse("<html><body> <h3>Funcionou perfeitamente :)</h3> </body></html>")

def requestTranslationsGeneration(request):
    if request.method == "POST":
        createTranslationsForAllTitles(request.POST.get("targetLanguage"))
        return redirect("generate_translations")
    return render(request, "generate_translations.html")
    
def createTranslationsForAllTitles(targetLanguage):
    for _ in generateTranslationsInBatches(targetLanguage):
        pass

def generateTranslationsInBatches(targetLanguage):
    """Yields 'start', one 'progress' per saved batch and 'done' events."""
    sourceLanguage = Map_configuration.objects.first().default_content_language
    maxNameLength = NameTranslation._meta.get_field('name').max_length
    pending = getElementsWithoutTranslation(targetLanguage)
    total = len(pending)
    done = 0
    yield {'type': 'start', 'total': total}

    try:
        for batch in splitInBatches(pending):
            translatedTitles = translateTexts([item['title'] for item in batch], targetLanguage, sourceLanguage)
            NameTranslation.objects.bulk_create(
                [
                    NameTranslation(
                        name=translatedTitle[:maxNameLength],
                        language_code=targetLanguage,
                        object_id=item['objectId'],
                        content_type=item['contentType'],
                    )
                    for item, translatedTitle in zip(batch, translatedTitles)
                ],
                ignore_conflicts=True,
            )
            done += len(batch)
            yield {'type': 'progress', 'done': done, 'total': total, 'model': batch[-1]['model']}
    finally:
        # bulk_create skips the signals that invalidate the map data cache
        if done:
            invalidate_map_data_cache()

    yield {'type': 'done', 'done': done, 'total': total}

def getElementsWithoutTranslation(targetLanguage):
    pending = []
    for model in TRANSLATABLE_MODELS:
        contentType = ContentType.objects.get_for_model(model)
        translatedIds = NameTranslation.objects.filter(
            language_code=targetLanguage, content_type=contentType
        ).values('object_id')
        elements = model.objects.filter(translatable=True).exclude(id__in=translatedIds).order_by('id')
        for element in elements:
            title = getElementTitle(element)
            if title:
                pending.append({
                    'contentType': contentType,
                    'objectId': element.id,
                    'title': title,
                    'model': str(model._meta.verbose_name_plural),
                })
    return pending

def splitInBatches(items, maxSize=TRANSLATION_BATCH_SIZE, maxChars=TRANSLATION_BATCH_MAX_CHARS):
    batch, batchChars = [], 0
    for item in items:
        if batch and (len(batch) >= maxSize or batchChars + len(item['title']) > maxChars):
            yield batch
            batch, batchChars = [], 0
        batch.append(item)
        batchChars += len(item['title'])
    if batch:
        yield batch

def getElementTitle(element):
    if hasattr(element, 'name'):
        return element.name
    if hasattr(element, 'display_name'):
        return element.display_name
    return None

def normalizeLanguageCode(code):
    if not code:
        return {'macro_language': 'auto', 'variation': None}
    
    code_parts = re.split(r'[-_]', code)
    macro_language = code_parts[0].lower()
    variation_code = code_parts[1].lower() if len(code_parts) > 1 else None
    return {'macro_language': macro_language, 'variation': variation_code}
    
def translateTexts(texts, target, source="auto"):
    translationRequest = {
        "q": texts,
        "source": normalizeLanguageCode(source)['macro_language'],
        "target": normalizeLanguageCode(target)['macro_language']
    }

    response = requests.post(TRANSLATOR_URL, json=translationRequest, timeout=120)
    try:
        result = response.json()
    except ValueError:
        result = {}
    if 'translatedText' not in result:
        raise RuntimeError(result.get('error') or f"Translator returned HTTP {response.status_code}")
    return result['translatedText']

def translateText(text, target, source="auto"):
    return translateTexts([text], target, source)[0]

def createTitleTranslation(element, targetLanguageCode, sourceLanguageCode = "auto"):
    if element:
        contentType = ContentType.objects.get_for_model(element)
        originalTitle = getElementTitle(element)

        if(contentType and originalTitle):
            translatedTitle = translateText(originalTitle, targetLanguageCode, sourceLanguageCode)
            newTranslation = NameTranslation(name=translatedTitle, language_code = targetLanguageCode, object_id = element.id, content_type=contentType)
            newTranslation.save()
            return True
    return False
    
@csrf_exempt
def translate_text_api(request):
    if request.method == "POST":
        data = json.loads(request.body)

        text = data.get("text")
        target = data.get("target")

        try:
            translated = translateText(text, target)
            return JsonResponse({"translated": translated})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Invalid request"}, status=400)
