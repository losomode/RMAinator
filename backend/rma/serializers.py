from rest_framework import serializers
from .models import RMA, RMAGroup, RMAAttachment, RMAStateHistory
from core.serializers import UserSerializer
from core.userinator_client import userinator_client
from datetime import date as _date


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
    group_name = serializers.SerializerMethodField()
    group_created_at = serializers.SerializerMethodField()
    latest_note = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()

    class Meta:
        model = RMA
        fields = (
            'id', 'rma_number', 'serial_number', 'device_type', 'owner', 'company_id',
            'company_name', 'state', 'priority', 'created_at', 'updated_at', 'is_archived',
            'years_in_field', 'group_id', 'group_name', 'group_created_at', 'latest_note'
        )
        read_only_fields = ('id', 'rma_number', 'owner', 'created_at', 'updated_at', 'group_id', 'group_name', 'group_created_at', 'latest_note')

    def get_group_name(self, obj):
        """Return the group name (empty string if group has no name set)."""
        if obj.group_id is not None and obj.group:
            return obj.group.name or None
        return None

    def get_group_created_at(self, obj):
        """Return the group's created_at ISO string for dashboard year bucketing."""
        if obj.group_id is not None and obj.group:
            return obj.group.created_at.isoformat() if obj.group.created_at else None
        return None

    def get_latest_note(self, obj):
        """Return the most recent non-empty note from state history."""
        for entry in obj.state_history.all():  # ordered by -changed_at via model Meta
            if entry.notes and entry.notes.strip():
                return entry.notes.strip()
        return None
    
    def get_company_name(self, obj):
        """Fetch company name from USERinator."""
        if obj.company_id is None:
            return None
        
        company_data = userinator_client.get_company(obj.company_id)
        if company_data:
            return company_data.get('name')
        
        return None


class RMADetailSerializer(serializers.ModelSerializer):
    """Serializer for RMA detail view (full information)."""
    owner = UserSerializer(read_only=True)
    attachments = RMAAttachmentSerializer(many=True, read_only=True)
    state_history = RMAStateHistorySerializer(many=True, read_only=True)
    years_in_field = serializers.ReadOnlyField()
    is_archived = serializers.ReadOnlyField()
    company_name = serializers.SerializerMethodField()

    class Meta:
        model = RMA
        fields = '__all__'
        read_only_fields = (
            'id', 'rma_number', 'owner', 'created_at', 'updated_at',
            'years_in_field', 'is_archived'
        )

    def get_company_name(self, obj):
        """Fetch company name from USERinator."""
        if obj.company_id is None:
            return None

        company_data = userinator_client.get_company(obj.company_id)
        if company_data:
            return company_data.get('name')

        return None

    def to_representation(self, instance):
        """Customize representation based on user role."""
        data = super().to_representation(instance)
        request = self.context.get('request')

        # Hide admin-only fields from non-admin users
        if request and not request.user.is_admin:
            admin_fields = [
                'root_cause', 'parts_replaced', 'cost_to_repair', 'device_mac',
                'return_tracking_number',
                'qa_reflashed', 'qa_image_version', 'qa_nvme_data_ok',
                'qa_services_ok', 'qa_uptime_ok', 'qa_stream_uptime_ok', 'qa_lens_control_ok',
                'rejection_reason'
            ]
            for field in admin_fields:
                data.pop(field, None)

        return data


class RMACreateSerializer(serializers.ModelSerializer):
    """Serializer for RMA creation (customer-facing fields only)."""

    company_id = serializers.IntegerField(required=True)

    class Meta:
        model = RMA
        fields = (
            'serial_number', 'device_type', 'ipn', 'fault_notes', 'priority', 'company_id'
        )

    def validate_company_id(self, value):
        company_data = userinator_client.get_company(value)
        if not company_data:
            raise serializers.ValidationError('Invalid company_id')
        return value

    def create(self, validated_data):
        # Set owner from request user
        request_user = self.context['request'].user
        validated_data['owner'] = request_user

        # Enforce company scoping rules:
        # - Non-admins must use their JWT company
        # - Admins may create for any company
        requested_company_id = validated_data.get('company_id')
        if not request_user.is_admin:
            jwt_company_id = getattr(request_user, 'company_id_remote', None)
            if jwt_company_id is None:
                raise serializers.ValidationError({'company_id': 'User has no company assigned'})
            if requested_company_id != jwt_company_id:
                raise serializers.ValidationError({'company_id': 'Must match your assigned company'})

        return super().create(validated_data)


class RMAUpdateSerializer(serializers.ModelSerializer):
    """Serializer for RMA updates (admins can update all fields)."""

    # Allow reassigning to a different group (or null to make standalone)
    group_id = serializers.PrimaryKeyRelatedField(
        source='group',
        queryset=RMAGroup.objects.all(),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = RMA
        fields = (
            'priority', 'first_ship_date', 'device_type', 'ipn', 'fault_notes', 'rma_received_date',
            'return_date', 'root_cause', 'parts_replaced', 'cost_to_repair',
            'device_mac', 'return_tracking_number',
            'qa_reflashed', 'qa_image_version', 'qa_nvme_data_ok',
            'qa_services_ok', 'qa_uptime_ok', 'qa_stream_uptime_ok', 'qa_lens_control_ok',
            'rejection_reason', 'group_id'
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
            RMA.State.REPAIRED: [RMA.State.IN_QA],
            RMA.State.REPLACED: [RMA.State.IN_QA],
            RMA.State.IN_QA: [RMA.State.READY_FOR_RETURN],
            RMA.State.READY_FOR_RETURN: [RMA.State.SHIPPED],
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
                RMA.State.IN_QA: 5,
                RMA.State.READY_FOR_RETURN: 6,
                RMA.State.SHIPPED: 7,
            }
            revertable_from = {
                RMA.State.APPROVED, RMA.State.RECEIVED, RMA.State.DIAGNOSED,
                RMA.State.REPAIRED, RMA.State.REPLACED, RMA.State.IN_QA,
                RMA.State.READY_FOR_RETURN, RMA.State.SHIPPED,
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
    company_name = serializers.SerializerMethodField()
    device_count = serializers.ReadOnlyField()

    class Meta:
        model = RMAGroup
        fields = (
            'id', 'name', 'company_id', 'company_name', 'return_shipping_address',
            'created_by', 'created_at', 'device_count', 'rmas'
        )
        read_only_fields = ('id', 'created_by', 'created_at', 'device_count', 'company_name')

    def get_company_name(self, obj):
        if obj.company_id is None:
            return None
        company_data = userinator_client.get_company(obj.company_id)
        return company_data.get('name') if company_data else None


class RMAGroupCreateSerializer(serializers.Serializer):
    """Serializer for creating multiple RMAs in a group."""

    name = serializers.CharField(required=False, allow_blank=True)
    company_id = serializers.IntegerField(required=True)
    return_shipping_address = serializers.CharField(required=False, allow_blank=True)
    rmas = RMACreateSerializer(many=True)

    def validate_company_id(self, value):
        company_data = userinator_client.get_company(value)
        if not company_data:
            raise serializers.ValidationError('Invalid company_id')
        return value

    def create(self, validated_data):
        request = self.context['request']

        requested_company_id = validated_data['company_id']

        # Enforce company scoping rules:
        # - Non-admins must use their JWT company
        # - Admins may create for any company
        if not request.user.is_admin:
            jwt_company_id = getattr(request.user, 'company_id_remote', None)
            if jwt_company_id is None:
                raise serializers.ValidationError({'company_id': 'User has no company assigned'})
            if requested_company_id != jwt_company_id:
                raise serializers.ValidationError({'company_id': 'Must match your assigned company'})

        # Get RMAs data up-front (needed for auto-generated name count)
        rmas_data = validated_data['rmas']

        # Auto-generate group name if not provided
        name = validated_data.get('name', '').strip()
        if not name:
            company_data = userinator_client.get_company(requested_company_id)
            company_raw = company_data.get('name', 'Unknown') if company_data else 'Unknown'
            month_year = _date.today().strftime('%B %Y')
            name = f"{company_raw} {month_year}"

        # Create group
        group = RMAGroup.objects.create(
            created_by=request.user,
            name=name,
            company_id=requested_company_id,
            return_shipping_address=validated_data.get('return_shipping_address', ''),
        )

        # Create RMAs in the group
        rmas = []
        for rma_data in rmas_data:
            # RMACreateSerializer includes company_id; remove to avoid duplication
            rma_data.pop('company_id', None)
            rma = RMA.objects.create(
                owner=request.user,
                group=group,
                company_id=requested_company_id,
                **rma_data
            )
            rmas.append(rma)

        return {
            'group': group,
            'rmas': rmas
        }
