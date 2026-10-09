import threading

from django.db import connection

from .views import generateTranslationsInBatches

_jobs = {}
_lock = threading.Lock()


def getTranslationJob(key):
    with _lock:
        job = _jobs.get(key)
        return dict(job) if job else None


def startTranslationJob(key, targetLanguage, schemaContext):
    with _lock:
        job = _jobs.get(key)
        if job and job['state'] == 'running':
            return dict(job)
        job = {'state': 'running', 'language': targetLanguage, 'done': 0, 'total': None, 'model': '', 'error': ''}
        _jobs[key] = job

    threading.Thread(target=_runTranslationJob, args=(job, targetLanguage, schemaContext), daemon=True).start()
    return dict(job)


def _runTranslationJob(job, targetLanguage, schemaContext):
    try:
        with schemaContext():
            for event in generateTranslationsInBatches(targetLanguage):
                with _lock:
                    job['total'] = event['total']
                    job['done'] = event.get('done', job['done'])
                    job['model'] = event.get('model', job['model'])
                    if event['type'] == 'done':
                        job['state'] = 'done'
    except Exception as e:
        with _lock:
            job['state'] = 'error'
            job['error'] = str(e)
    finally:
        connection.close()
