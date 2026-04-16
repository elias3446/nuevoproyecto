class SchemaRouter:
    """
    Un router para controlar en quÃ© esquema se coloca cada aplicaciÃ³n.
    """
    APP_MAP = {
        'django_celery_results': 'celery',
        'django_celery_beat': 'celery',
        'token_blacklist': 'jwt',
        'admin': 'django',
        'sessions': 'django',
        'contenttypes': 'django',
        'auth': 'django', # El modelo User ya tiene su propio db_table='"auth"."users"', esto no lo afectarÃ¡
    }

    def db_for_read(self, model, **hints):
        return 'default'

    def db_for_write(self, model, **hints):
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        return True

    def __init__(self):
        # El search_path configurado en DB se encarga del resto
        pass
