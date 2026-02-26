from django.contrib import admin
from users.models import User

# Register minimal user admin
admin.site.register(User)
