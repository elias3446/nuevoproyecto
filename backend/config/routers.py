class SchemaRouter:
    """
    Un router para controlar en quÃ© esquema se coloca cada aplicaciÃ³n.
    """
    APP_MAP = {
        'django_celery_beat':    'celery_db',
        'django_celery_results': 'celery_db',
        'token_blacklist':       'jwt_db',
        'users':                 'auth_db',
        'auth':                  'default', # django schemas
        'admin':                 'default',
        'sessions':              'default',
        'contenttypes':          'default',
    }

    def db_for_read(self, model, **hints):
        return self.APP_MAP.get(model._meta.app_label, 'default')

    def db_for_write(self, model, **hints):
        return self.APP_MAP.get(model._meta.app_label, 'default')

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        target_db = self.APP_MAP.get(app_label, 'default')
        return db == target_db

    def __init__(self):
        # El search_path configurado en DB se encarga del resto
        pass
