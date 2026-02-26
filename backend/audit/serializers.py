from rest_framework import serializers
from .models import AuditLog
from core.serializers import UserSerializer


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit log entries."""
    user = UserSerializer(read_only=True)
    content_type_name = serializers.SerializerMethodField()
    
    class Meta:
        model = AuditLog
        fields = (
            'id', 'timestamp', 'user', 'action', 'content_type', 'content_type_name',
            'object_id', 'field_name', 'old_value', 'new_value', 'notes'
        )
        read_only_fields = fields
    
    def get_content_type_name(self, obj):
        """Get human-readable content type name."""
        return str(obj.content_type)
