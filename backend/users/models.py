from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Custom user model with role and verification status."""
    
    class Role(models.TextChoices):
        USER = 'USER', 'User'
        ADMIN = 'ADMIN', 'Admin'
    
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.USER,
    )
    is_verified = models.BooleanField(
        default=False,
        help_text='Designates whether this user has been verified by an admin.'
    )
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN
    
    class Meta:
        ordering = ['-date_joined']
