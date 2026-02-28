import io
import zipfile

from django.shortcuts import render

from .sources.InfraDPDI import Requester, Translator
from .sources import Merger, Replacer
from .sources.CSV import Detector, Validator, Translator as CSVTranslator


def index(request):
    return netbox(request)


def netbox(request):
    request.session['importedData'] = None

    MapData_diff = Merger.run(Translator.run(Requester.get()))

    if MapData_diff:
        request.session['importedData'] = MapData_diff
        return render(request, 'importer/diff.html',
                      _admin_context(request, 'Preview Changes', {'models': MapData_diff}))
    else:
        status = {'status': "No changes detected.", 'logs': []}
        return render(request, 'importer/applied_changes.html',
                      _admin_context(request, 'Import Results', {'status': status}))


def replace(request):
    replaceStatus = Replacer.execute(request)
    return render(request, 'importer/applied_changes.html',
                  _admin_context(request, 'Import Results', {'status': replaceStatus}))


def _extract_named_files(request):
    """
    Returns a list of (filename, file_like_object) from the upload.
    Handles:
      - A single .zip file (field name 'zip_file')
      - One or more .csv files (field name 'csv_files')
    """
    named_files = []

    zip_upload = request.FILES.get('zip_file')
    if zip_upload:
        try:
            zf = zipfile.ZipFile(zip_upload)
            for name in zf.namelist():
                if name.lower().endswith('.csv') and not name.startswith('__MACOSX'):
                    named_files.append((name.split('/')[-1], io.TextIOWrapper(zf.open(name), encoding='utf-8-sig')))
        except zipfile.BadZipFile:
            return None, ["The uploaded file is not a valid ZIP archive."]

    for uploaded_file in request.FILES.getlist('csv_files'):
        named_files.append((uploaded_file.name, uploaded_file))

    return named_files, []


def _admin_context(request, title, extra=None):
    """Build a base context enriched with the tenant admin site variables."""
    from administration.admin import tenant_admin_site
    try:
        context = tenant_admin_site.each_context(request)
    except Exception:
        context = {}
    context['title'] = title
    if extra:
        context.update(extra)
    return context


def _csv_upload_context(request, extra=None):
    return _admin_context(request, 'Import data from CSV', extra)


def csv_upload(request):
    if request.method == 'GET':
        return render(request, 'importer/csv_upload.html', _csv_upload_context(request))

    request.session['importedData'] = None

    # --- Extract files ---
    named_files, extract_errors = _extract_named_files(request)
    if extract_errors:
        return render(request, 'importer/csv_upload.html',
                      _csv_upload_context(request, {'errors': extract_errors}))

    if not named_files:
        return render(request, 'importer/csv_upload.html',
                      _csv_upload_context(request, {'errors': [
                          "No files were uploaded. Please select at least one CSV file or a ZIP archive."
                      ]}))

    # --- Detect file types ---
    detected_files, detect_errors = Detector.detect(named_files)
    if detect_errors:
        return render(request, 'importer/csv_upload.html',
                      _csv_upload_context(request, {'errors': detect_errors}))

    if not detected_files:
        return render(request, 'importer/csv_upload.html',
                      _csv_upload_context(request, {'errors': [
                          "No recognizable CSV files found. Please upload files for locations, tags, or links."
                      ]}))

    # --- Validate ---
    validation_errors = Validator.validate(detected_files)
    if validation_errors:
        return render(request, 'importer/csv_upload.html',
                      _csv_upload_context(request, {'errors': validation_errors, 'is_validation': True}))

    # --- Translate → Merge → Diff ---
    try:
        mapData = CSVTranslator.run(detected_files)
        MapData_diff = Merger.run(mapData)
    except Exception as e:
        return render(request, 'importer/csv_upload.html',
                      _csv_upload_context(request, {'errors': [
                          f"An error occurred while processing the files: {e}"
                      ]}))

    if MapData_diff:
        request.session['importedData'] = MapData_diff
        return render(request, 'importer/diff.html',
                      _admin_context(request, 'Preview Changes', {'models': MapData_diff}))
    else:
        status = {
            'status': "No changes detected. The data in the uploaded files matches what is already in the database.",
            'logs': []
        }
        return render(request, 'importer/applied_changes.html',
                      _admin_context(request, 'Import Results', {'status': status}))
