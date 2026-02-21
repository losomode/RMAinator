from django.apps import AppConfig


class UsersConfig(AppConfig):
    name = 'users'
    
    def ready(self):
        import users.signals
        import users.sso_views  # Import SSO signal handlers
