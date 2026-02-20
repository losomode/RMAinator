from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'user', 'action', 'content_type', 'object_id', 'field_name']
    list_filter = ['action', 'content_type', 'timestamp']
    search_fields = ['user__username', 'field_name', 'notes']
    readonly_fields = ['timestamp', 'content_type', 'object_id', 'user', 'action', 'field_name', 'old_value', 'new_value']
    ordering = ['-timestamp']
    
    def has_add_permission(self, request):
        # Audit logs should not be manually created
        return False
    
    def has_delete_permission(self, request, obj=None):
        # Audit logs should not be deleted
        return False
