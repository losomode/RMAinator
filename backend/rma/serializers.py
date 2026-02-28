from rest_framework import serializers
from .models import RMA, RMAGroup, RMAAttachment, RMAStateHistory
from core.serializers import UserSerializer


class RMAAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for RMA attachments."""
    uploaded_by = UserSerializer(read_only=True)
    
    class Meta:
        model = RMAAttachment
        fields = ('id', 'file', 'filename', 'uploaded_by', 'uploaded_at', 'file_size')
        read_only_fields = ('id', 'uploaded_by', 'uploaded_at', 'file_size')


class RMAStateHistorySerializer(serializers.ModelSerializer):
    """Serializer for RMA state history."""
    changed_by = UserSerializer(read_only=True)
    
    class Meta:
        model = RMAStateHistory
        fields = ('id', 'from_state', 'to_state', 'changed_by', 'changed_at', 'notes')
        read_only_fields = ('id', 'from_state', 'to_state', 'changed_by', 'changed_at')


class RMAListSerializer(serializers.ModelSerializer):
    """Serializer for RMA list view (summary)."""
    owner = UserSerializer(read_only=True)
    years_in_field = serializers.ReadOnlyField()
    is_archived = serializers.ReadOnlyField()
    group_id = serializers.IntegerField(source='group.id', read_only=True, allow_null=True)
    
    class Meta:
        model = RMA
        fields = (
            'id', 'rma_number', 'serial_number', 'owner', 'state', 'priority',
            'created_at', 'updated_at', 'is_archived', 'years_in_field', 'group_id'
        )
        read_only_fields = ('id', 'rma_number', 'owner', 'created_at', 'updated_at', 'group_id')


class RMADetailSerializer(serializers.ModelSerializer):
    """Serializer for RMA detail view (full information)."""
    owner = UserSerializer(read_only=True)
    attachments = RMAAttachmentSerializer(many=True, read_only=True)
    state_history = RMAStateHistorySerializer(many=True, read_only=True)
    years_in_field = serializers.ReadOnlyField()
    is_archived = serializers.ReadOnlyField()
    
    class Meta:
        model = RMA
        fields = '__all__'
        read_only_fields = (
            'id', 'rma_number', 'owner', 'created_at', 'updated_at',
            'years_in_field', 'is_archived'
        )
    
    def to_representation(self, instance):
        """Customize representation based on user role."""
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        # Hide admin-only fields from non-admin users
        if request and not request.user.is_admin:
            admin_fields = [
                'root_cause', 'parts_replaced', 'cost_to_repair', 'tx2_mac',
                'script_ran', 'services_enabled', 'uptime_good', 'stream_good',
                'ship_ready', 'rejection_reason'
            ]
            for field in admin_fields:
                data.pop(field, None)
        
        return data


class RMACreateSerializer(serializers.ModelSerializer):
    """Serializer for RMA creation (user-submitted fields only)."""
    
    class Meta:
        model = RMA
        fields = (
            'serial_number', 'first_ship_date', 'fault_notes', 'priority'
        )
    
    def create(self, validated_data):
        # Set owner from request user
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class RMAUpdateSerializer(serializers.ModelSerializer):
    """Serializer for RMA updates (admins can update all fields)."""
    
    class Meta:
        model = RMA
        fields = (
            'priority', 'first_ship_date', 'fault_notes', 'rma_received_date',
            'return_date', 'root_cause', 'parts_replaced', 'cost_to_repair',
            'tx2_mac', 'script_ran', 'services_enabled', 'uptime_good',
            'stream_good', 'ship_ready', 'rejection_reason'
        )


class RMAStateUpdateSerializer(serializers.Serializer):
    """Serializer for RMA state transitions."""
    state = serializers.ChoiceField(choices=RMA.State.choices)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_state(self, value):
        """Validate state transition is valid.
        
        Terminal states (COMPLETED/REJECTED) are permanent for everyone.
        Normal forward transitions follow strict rules.
        Admins can additionally revert to earlier states when the RMA
        is in the active workflow range (APPROVED through SHIPPED).
        """
        rma = self.context.get('rma')
        if not rma:
            return value
        
        current_state = rma.state
        
        # Terminal states are permanent — no transitions out, even for admins
        if current_state in [RMA.State.COMPLETED, RMA.State.REJECTED]:
            raise serializers.ValidationError(
                f"Cannot transition from terminal state '{current_state}'"
            )
        
        # Same state check
        if value == current_state:
            raise serializers.ValidationError(
                f"RMA is already in state '{current_state}'"
            )
        
        # Define valid forward transitions
        valid_transitions = {
            RMA.State.SUBMITTED: [RMA.State.APPROVED, RMA.State.REJECTED],
            RMA.State.APPROVED: [RMA.State.RECEIVED],
            RMA.State.RECEIVED: [RMA.State.DIAGNOSED],
            RMA.State.DIAGNOSED: [RMA.State.REPAIRED, RMA.State.REPLACED],
            RMA.State.REPAIRED: [RMA.State.SHIPPED],
            RMA.State.REPLACED: [RMA.State.SHIPPED],
            RMA.State.SHIPPED: [RMA.State.COMPLETED],
        }
        
        # Normal forward transition — allowed for everyone
        if value in valid_transitions.get(current_state, []):
            return value
        
        # Admin backward transition within active workflow range
        if self.context.get('is_admin'):
            state_order = {
                RMA.State.SUBMITTED: 0,
                RMA.State.APPROVED: 1,
                RMA.State.RECEIVED: 2,
                RMA.State.DIAGNOSED: 3,
                RMA.State.REPAIRED: 4,
                RMA.State.REPLACED: 4,
                RMA.State.SHIPPED: 5,
            }
            revertable_from = {
                RMA.State.APPROVED, RMA.State.RECEIVED, RMA.State.DIAGNOSED,
                RMA.State.REPAIRED, RMA.State.REPLACED, RMA.State.SHIPPED,
            }
            if (current_state in revertable_from and
                    value in state_order and
                    state_order[value] < state_order[current_state]):
                return value
        
        # Invalid transition
        allowed = valid_transitions.get(current_state, [])
        raise serializers.ValidationError(
            f"Invalid transition from '{current_state}' to '{value}'. "
            f"Allowed: {', '.join(allowed)}"
        )
        
        return value


class RMAGroupSerializer(serializers.ModelSerializer):
    """Serializer for RMA groups."""
    created_by = UserSerializer(read_only=True)
    rmas = RMAListSerializer(many=True, read_only=True)
    
    class Meta:
        model = RMAGroup
        fields = ('id', 'created_by', 'created_at', 'rmas')
        read_only_fields = ('id', 'created_by', 'created_at')


class RMAGroupCreateSerializer(serializers.Serializer):
    """Serializer for creating multiple RMAs in a group."""
    rmas = RMACreateSerializer(many=True)
    
    def create(self, validated_data):
        request = self.context['request']
        
        # Create group
        group = RMAGroup.objects.create(created_by=request.user)
        
        # Create RMAs in the group
        rmas_data = validated_data['rmas']
        rmas = []
        for rma_data in rmas_data:
            rma = RMA.objects.create(
                owner=request.user,
                group=group,
                **rma_data
            )
            rmas.append(rma)
        
        return {
            'group': group,
            'rmas': rmas
        }
