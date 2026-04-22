class SchemaRouter:
    """
    Un router para controlar en quÃ© esquema se coloca cada aplicaciÃ³n.
    """
    APP_MAP = {
        'django_celery_beat':    'celery_db',
        'django_celery_results': 'celery_db',
        'token_blacklist':       'jwt_db',
        'users':                 'common_db',
        'auth':                  'common_db', 
        'admin':                 'common_db',
        'sessions':              'common_db',
        'contenttypes':          'common_db',
        # ATS Apps
        'ats_roles':             'roles_db',
        'ats':                   'default',
        'audit':                 'audit_db',
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
