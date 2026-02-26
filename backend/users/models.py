"""
Minimal User model for database foreign key relations.

NOTE: This model is NOT used for authentication. Authentication is handled by
the external Authinator service. This model exists solely to maintain database
integrity for ForeignKey relations in RMA, Audit, and Notification models.

User objects in this table are created automatically when needed by the system
and store minimal information (just ID and username for reference).
"""
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """
    Minimal user model for database relations.
    
    This is a stub model that maintains database foreign key integrity.
    Actual authentication is handled by Authinator.
    """
    
    class Meta:
        db_table = 'users_user'
    
    def __str__(self):
        return self.username
