from django.shortcuts import render
from django.http import HttpResponse
from django.template import loader
from django.utils.translation import gettext as _

from .sources.InfraDPDI import Requester, Translator
from .sources import Merger, Replacer

def index(request):
    return netbox(request)

def netbox(request):
    request.session['importedData'] = None

    # Separar gets dos modulos, usando try except
    MapData_diff = Merger.run(Translator.run(Requester.get()))
    
    if MapData_diff:
        context = {
            'models': MapData_diff
        }
        template = loader.get_template('importer/diff.html')
        request.session['importedData'] = MapData_diff
        return HttpResponse(template.render(context, request))
    else:
        status = { 'status': _("No changes detected."), 'logs': [] }
        template = loader.get_template('importer/applied_changes.html')
        context = { 'status': status }
        
        return HttpResponse(template.render(context, request))
    

def replace(request):
    replaceStatus = Replacer.execute(request)
    template = loader.get_template('importer/applied_changes.html')
    context = { 'status': replaceStatus }
    
    return HttpResponse(template.render(context, request))
