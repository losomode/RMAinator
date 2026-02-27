from rest_framework import serializers
from .models import StateTimeout


class StateTimeoutSerializer(serializers.ModelSerializer):
    """Serializer for StateTimeout configuration."""
    
    state_display = serializers.CharField(source='get_state_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    class Meta:
        model = StateTimeout
        fields = ['id', 'state', 'state_display', 'priority', 'priority_display', 'timeout_hours']
        read_only_fields = ['id']
    
    def validate_timeout_hours(self, value):
        """Validate that timeout is positive."""
        if value <= 0:
            raise serializers.ValidationError("Timeout must be greater than 0 hours")
        return value
