from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class AuditLog(models.Model):
    """
    Model to track all changes to RMAs and other important objects.
    
    Records who changed what, when, and what the old/new values were.
    """
    class Action(models.TextChoices):
        CREATE = 'CREATE', 'Created'
        UPDATE = 'UPDATE', 'Updated'
        DELETE = 'DELETE', 'Deleted'
        STATE_CHANGE = 'STATE_CHANGE', 'State Changed'
    
    # Generic foreign key to track any model
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Action details
    action = models.CharField(
        max_length=20,
        choices=Action.choices,
        default=Action.UPDATE
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    # Field change details
    field_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="Name of the field that changed"
    )
    old_value = models.TextField(
        blank=True,
        null=True,
        help_text="Previous value (as string)"
    )
    new_value = models.TextField(
        blank=True,
        null=True,
        help_text="New value (as string)"
    )
    
    # Additional context
    notes = models.TextField(
        blank=True,
        help_text="Optional notes about this change"
    )
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['content_type', 'object_id', '-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
        ]
        verbose_name = 'Audit Log Entry'
        verbose_name_plural = 'Audit Log Entries'
    
    def __str__(self):
        if self.field_name:
            return f"{self.user} {self.action} {self.field_name} on {self.content_type} #{self.object_id}"
        return f"{self.user} {self.action} {self.content_type} #{self.object_id}"
