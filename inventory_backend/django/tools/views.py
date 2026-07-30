from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
import requests, json
from administration.models import *
from django.views.decorators.csrf import csrf_exempt

def translateText2(request):
    createTranslationsForAllTitles('ko')
    return HttpResponse("<html><body> <h3>Funcionou perfeitamente :)</h3> </body></html>")

def requestTranslationsGeneration(request):
    if request.method == "POST":
        createTranslationsForAllTitles(request.POST.get("targetLanguage"))
        return redirect("generate_translations")
    return render(request, "generate_translations.html")
    
def createTranslationsForAllTitles(targetLanguage):
    translatableModels = [Menu, MenuGroup, Tag, Links_group, Link, Location, Kml_shape]
    translationsTable = NameTranslation.objects.all().filter(language_code = targetLanguage)
    systemLanguage = Map_configuration.objects.first().default_content_language
    
    for model in translatableModels:
        elements = model.objects.all()  
        modelContentType = ContentType.objects.get_for_model(model)
        elementsIdsInTranslationTable = [translation.object_id for translation in translationsTable if translation.content_type == modelContentType]
        for element in elements:      
            if element.id not in elementsIdsInTranslationTable:                
                createTitleTranslation(element, targetLanguage, systemLanguage)                
        
def translateText(text, target, source="auto"):
    url = 'http://translator:5000/translate'
    translationRequest = {
        "q":text,
        "source":source,
        "target": target
    }
    
    response = requests.post(url, json=translationRequest)
    
    return response.json()['translatedText']

def createTitleTranslation(element, targetLanguageCode, sourceLanguageCode = "auto"):
    if element:
        contentType = ContentType.objects.get_for_model(element)
        
        if hasattr(element, 'name'):
            originalTitle = element.name
        elif hasattr(element, 'display_name'):
            originalTitle = element.display_name

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
