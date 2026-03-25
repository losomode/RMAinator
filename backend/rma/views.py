from rest_framework import generics, status, views, filters
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Q
from django.contrib.contenttypes.models import ContentType
from datetime import date
from core.permissions import IsAdmin
from .models import RMA, RMAAttachment, RMAGroup
from .serializers import (
    RMAListSerializer, RMADetailSerializer, RMACreateSerializer,
    RMAUpdateSerializer, RMAStateUpdateSerializer, RMAAttachmentSerializer,
    RMAGroupSerializer, RMAGroupCreateSerializer
)
from audit.models import AuditLog
from audit.serializers import AuditLogSerializer


class RMAListCreateView(generics.ListCreateAPIView):
    """API endpoint to list and create RMAs."""
    permission_classes = (IsAuthenticated,)
    pagination_class = None  # Disable pagination - show all RMAs
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return RMACreateSerializer
        return RMAListSerializer
    
    def get_queryset(self):
        user = self.request.user
        role_level = getattr(user, 'role_level', 0)
        user_company = getattr(user, 'company_id_remote', None)
        
        queryset = RMA.objects.select_related('owner', 'group').prefetch_related('attachments', 'state_history')

        # ADMIN sees all RMAs, others see only their company's RMAs
        if role_level < 100 and user_company:
            queryset = queryset.filter(company_id=user_company)
        
        # ADMIN can filter by company (non-admins cannot override their company scope)
        company_filter = self.request.query_params.get('company')
        if company_filter and role_level >= 100:
            try:
                company_id = int(company_filter)
                queryset = queryset.filter(company_id=company_id)
            except (ValueError, TypeError):
                pass  # Ignore invalid company_id
        
        # Filter by archived status
        archived = self.request.query_params.get('archived')
        if archived is not None:
            if archived.lower() == 'true':
                queryset = queryset.filter(state__in=[RMA.State.COMPLETED, RMA.State.REJECTED])
            else:
                queryset = queryset.exclude(state__in=[RMA.State.COMPLETED, RMA.State.REJECTED])
        
        return queryset


class RMADetailView(generics.RetrieveUpdateDestroyAPIView):
    """API endpoint to retrieve, update, or delete an RMA.
    
    - All users can view RMAs in their company
    - Only ADMIN can edit or delete RMAs
    """
    permission_classes = (IsAuthenticated,)
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return RMAUpdateSerializer
        return RMADetailSerializer
    
    def get_queryset(self):
        user = self.request.user
        role_level = getattr(user, 'role_level', 0)
        user_company = getattr(user, 'company_id_remote', None)
        
        queryset = RMA.objects.select_related('owner', 'group').prefetch_related(
            'attachments', 'state_history', 'state_history__changed_by'
        )
        
        # ADMIN sees all RMAs, others see only their company's RMAs
        if role_level < 100 and user_company:
            queryset = queryset.filter(company_id=user_company)
        
        return queryset
    
    def check_permissions(self, request):
        """Only ADMIN can edit or delete RMAs."""
        super().check_permissions(request)
        if request.method in ['PUT', 'PATCH', 'DELETE']:
            role_level = getattr(request.user, 'role_level', 0)
            if role_level < 100:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('Only ADMIN can edit or delete RMAs.')
    
    def perform_update(self, serializer):
        # Store user who made the change for state history
        serializer.instance._changed_by = self.request.user
        serializer.save()


class RMAStateUpdateView(views.APIView):
    """API endpoint to update RMA state (admin only)."""
    permission_classes = (IsAdmin,)
    
    def post(self, request, pk):
        try:
            rma = RMA.objects.get(pk=pk)
        except RMA.DoesNotExist:
            return Response(
                {'error': 'RMA not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = RMAStateUpdateSerializer(
            data=request.data,
            context={'rma': rma, 'is_admin': request.user.is_admin}
        )
        serializer.is_valid(raise_exception=True)

        new_state = serializer.validated_data['state']

        # Auto-populate rma_received_date when transitioning to RECEIVED
        if new_state == RMA.State.RECEIVED and not rma.rma_received_date:
            rma.rma_received_date = date.today()

        # Auto-populate return fields when transitioning to SHIPPED
        if new_state == RMA.State.SHIPPED:
            rma.return_date = date.today()
            tracking_number = request.data.get('tracking_number', '').strip()
            if tracking_number:
                rma.return_tracking_number = tracking_number

        # Update state
        rma._changed_by = request.user
        rma.state = new_state
        rma.save()
        
        # Update the latest state history with notes if provided
        notes = serializer.validated_data.get('notes', '')
        if notes:
            latest_history = rma.state_history.first()
            if latest_history:
                latest_history.notes = notes
                latest_history.save()
        
        return Response({
            'message': 'RMA state updated successfully',
            'rma': RMADetailSerializer(rma, context={'request': request}).data
        })


class RMAAttachmentUploadView(views.APIView):
    """API endpoint to upload attachments to an RMA."""
    permission_classes = (IsAuthenticated,)
    parser_classes = (MultiPartParser, FormParser)
    
    def post(self, request, pk):
        try:
            rma = RMA.objects.get(pk=pk)
        except RMA.DoesNotExist:
            return Response(
                {'error': 'RMA not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check company-scoped permissions
        role_level = getattr(request.user, 'role_level', 0)
        user_company = getattr(request.user, 'company_id_remote', None)
        
        # ADMIN can upload to any RMA, others only to their company's RMAs
        if role_level < 100 and rma.company_id != user_company:
            return Response(
                {'error': 'You can only upload to RMAs in your own company'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        file = request.FILES.get('file')
        if not file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        attachment = RMAAttachment.objects.create(
            rma=rma,
            file=file,
            filename=file.name,
            uploaded_by=request.user,
            file_size=file.size
        )
        
        return Response(
            RMAAttachmentSerializer(attachment).data,
            status=status.HTTP_201_CREATED
        )


class RMAAttachmentDeleteView(generics.DestroyAPIView):
    """API endpoint to delete an attachment."""
    permission_classes = (IsAuthenticated,)
    queryset = RMAAttachment.objects.all()
    
    def get_queryset(self):
        user = self.request.user
        role_level = getattr(user, 'role_level', 0)
        user_company = getattr(user, 'company_id_remote', None)
        
        queryset = super().get_queryset()
        
        # ADMIN can delete any attachment, others only from their company's RMAs
        if role_level < 100 and user_company:
            queryset = queryset.filter(rma__company_id=user_company)
        
        return queryset


class RMAGroupCreateView(views.APIView):
    """API endpoint to create multiple RMAs in a group."""
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = RMAGroupCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        return Response({
            'message': f'Created {len(result["rmas"])} RMAs in group',
            'group': RMAGroupSerializer(result['group']).data,
            'rmas': RMAListSerializer(result['rmas'], many=True).data
        }, status=status.HTTP_201_CREATED)


class RMAGroupDetailUpdateView(views.APIView):
    """API endpoint to retrieve or update an RMA group."""
    permission_classes = (IsAuthenticated,)

    def _get_group(self, pk, user):
        try:
            group = RMAGroup.objects.prefetch_related('rmas', 'rmas__attachments', 'rmas__state_history').get(pk=pk)
        except RMAGroup.DoesNotExist:
            return None, Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)

        # Company-scoped access: non-admins can only access their own company's groups
        role_level = getattr(user, 'role_level', 0)
        user_company = getattr(user, 'company_id_remote', None)
        if role_level < 100 and user_company and group.company_id != user_company:
            return None, Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        return group, None

    def get(self, request, pk):
        group, err = self._get_group(pk, request.user)
        if err:
            return err
        return Response(RMAGroupSerializer(group, context={'request': request}).data)

    def patch(self, request, pk):
        # Only admins can update group metadata
        role_level = getattr(request.user, 'role_level', 0)
        if role_level < 100:
            return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)

        group, err = self._get_group(pk, request.user)
        if err:
            return err

        # Allow updating name, return_shipping_address, and created_at (for historical data)
        for field in ('name', 'return_shipping_address'):
            if field in request.data:
                setattr(group, field, request.data[field])

        if 'created_at' in request.data:
            from django.utils.dateparse import parse_datetime, parse_date
            raw = request.data['created_at']
            # Accept both 'YYYY-MM-DD' and full ISO datetime
            parsed = parse_datetime(raw)
            if parsed is None:
                d = parse_date(raw)
                if d:
                    from django.utils.timezone import make_aware
                    from datetime import datetime as _dt
                    parsed = make_aware(_dt(d.year, d.month, d.day))
            if parsed:
                group.created_at = parsed

        group.save()

        # Optionally backdate all RMAs in the group to match the group's creation date
        if request.data.get('also_update_rmas') and group.created_at:
            group.rmas.all().update(created_at=group.created_at)

        return Response(RMAGroupSerializer(group, context={'request': request}).data)

    def delete(self, request, pk):
        """Delete a group and all its RMAs permanently (admin only)."""
        role_level = getattr(request.user, 'role_level', 0)
        if role_level < 100:
            return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)

        group, err = self._get_group(pk, request.user)
        if err:
            return err

        rma_count = group.rmas.count()
        group.rmas.all().delete()  # Delete RMAs first (FK is SET_NULL, not CASCADE)
        group.delete()
        return Response(
            {'message': f'Deleted group and {rma_count} RMA(s) permanently'},
            status=status.HTTP_200_OK
        )


BULK_ELIGIBLE_STATES = {
    RMA.State.APPROVED,
    RMA.State.RECEIVED,
    RMA.State.SHIPPED,
    RMA.State.COMPLETED,
}

# For bulk transitions, what state must ALL RMAs currently be in
BULK_REQUIRED_CURRENT_STATE = {
    RMA.State.APPROVED: RMA.State.SUBMITTED,
    RMA.State.RECEIVED: RMA.State.APPROVED,
    RMA.State.SHIPPED: RMA.State.READY_FOR_RETURN,
    RMA.State.COMPLETED: RMA.State.SHIPPED,
}


class RMAGroupBulkStateView(views.APIView):
    """Atomically transition RMAs in a group to a new bulk-eligible state.

    Supports two shipment modes:
      - Full shipment (no rma_ids): all devices must be READY_FOR_RETURN.
      - Partial shipment (rma_ids provided): only listed devices are shipped;
        each must be READY_FOR_RETURN.

    COMPLETED transitions only devices currently in SHIPPED state,
    regardless of what state other devices in the group are in.
    """
    permission_classes = (IsAdmin,)

    def post(self, request, pk):
        try:
            group = RMAGroup.objects.prefetch_related('rmas').get(pk=pk)
        except RMAGroup.DoesNotExist:
            return Response({'error': 'Group not found'}, status=status.HTTP_404_NOT_FOUND)

        new_state = request.data.get('state')
        if not new_state or new_state not in BULK_ELIGIBLE_STATES:
            return Response(
                {'error': f'State must be one of: {sorted(s for s in BULK_ELIGIBLE_STATES)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        tracking_number = request.data.get('tracking_number', '')
        if new_state == RMA.State.SHIPPED and not tracking_number:
            return Response(
                {'error': 'tracking_number is required when state is SHIPPED'},
                status=status.HTTP_400_BAD_REQUEST
            )

        all_rmas = list(group.rmas.all())
        if not all_rmas:
            return Response({'error': 'Group has no RMAs'}, status=status.HTTP_400_BAD_REQUEST)

        if new_state == RMA.State.COMPLETED:
            # Complete Shipped: only complete devices currently in SHIPPED state
            rmas = [r for r in all_rmas if r.state == RMA.State.SHIPPED]
            if not rmas:
                return Response(
                    {'error': 'No shipped devices to complete in this group'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        elif new_state == RMA.State.SHIPPED:
            # Partial or full shipment
            rma_ids = request.data.get('rma_ids')
            if rma_ids:
                rma_id_set = set(rma_ids)
                rmas = [r for r in all_rmas if r.id in rma_id_set]
                if not rmas:
                    return Response({'error': 'No matching RMAs found'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                rmas = all_rmas

            errors = [
                {
                    'rma_number': r.rma_number,
                    'serial_number': r.serial_number,
                    'current_state': r.state,
                    'error': f'Expected READY_FOR_RETURN, got {r.state}',
                }
                for r in rmas if r.state != RMA.State.READY_FOR_RETURN
            ]
            if errors:
                return Response(
                    {'error': 'Not all selected RMAs are ready for return', 'details': errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

        else:
            # APPROVED, RECEIVED: support optional rma_ids for partial selection
            required_current = BULK_REQUIRED_CURRENT_STATE[new_state]
            rma_ids = request.data.get('rma_ids')
            if rma_ids:
                rma_id_set = set(rma_ids)
                rmas = [r for r in all_rmas if r.id in rma_id_set]
                if not rmas:
                    return Response({'error': 'No matching RMAs found'}, status=status.HTTP_400_BAD_REQUEST)
            else:
                rmas = all_rmas

            errors = [
                {
                    'rma_number': r.rma_number,
                    'serial_number': r.serial_number,
                    'current_state': r.state,
                    'error': f'Expected {required_current}, got {r.state}',
                }
                for r in rmas if r.state != required_current
            ]
            if errors:
                return Response(
                    {'error': 'Not all selected RMAs are eligible for this transition', 'details': errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Apply transition atomically
        with transaction.atomic():
            for rma in rmas:
                rma._changed_by = request.user
                if new_state == RMA.State.SHIPPED:
                    rma.return_tracking_number = tracking_number
                    rma.return_date = date.today()
                rma.state = new_state
                rma.save()

        return Response({
            'message': f'Transitioned {len(rmas)} RMA(s) to {new_state}',
            'group': RMAGroupSerializer(group, context={'request': request}).data,
        })


class RMASearchView(generics.ListAPIView):
    """API endpoint to search and filter RMAs (admin only)."""
    permission_classes = (IsAdmin,)
    serializer_class = RMAListSerializer
    
    def get_queryset(self):
        queryset = RMA.objects.select_related('owner', 'group').prefetch_related('attachments', 'state_history')

        # Search by multiple fields
        search = self.request.query_params.get('q')
        if search:
            queryset = queryset.filter(
                Q(rma_number__icontains=search) |
                Q(serial_number__icontains=search) |
                Q(owner__username__icontains=search) |
                Q(owner__email__icontains=search)
            )
        
        # Filter by state
        state = self.request.query_params.get('state')
        if state:
            queryset = queryset.filter(state=state)
        
        # Filter by priority
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # Filter by company
        company = self.request.query_params.get('company')
        if company:
            try:
                company_id = int(company)
                queryset = queryset.filter(company_id=company_id)
            except (ValueError, TypeError):
                pass  # Ignore invalid company_id
        
        # Filter by group
        group_id = self.request.query_params.get('group')
        if group_id:
            queryset = queryset.filter(group_id=group_id)
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        return queryset


class RMAAuditHistoryView(generics.ListAPIView):
    """API endpoint to get audit history for a specific RMA."""
    permission_classes = (IsAuthenticated,)
    serializer_class = AuditLogSerializer
    
    def get_queryset(self):
        rma_id = self.kwargs.get('pk')
        
        try:
            rma = RMA.objects.get(pk=rma_id)
        except RMA.DoesNotExist:
            return AuditLog.objects.none()
        
        # Check company-scoped permissions
        role_level = getattr(self.request.user, 'role_level', 0)
        user_company = getattr(self.request.user, 'company_id_remote', None)
        
        # ADMIN can view all audit logs, others only for their company's RMAs
        if role_level < 100 and rma.company_id != user_company:
            return AuditLog.objects.none()
        
        content_type = ContentType.objects.get_for_model(RMA)
        
        # Get all audit logs for this RMA
        queryset = AuditLog.objects.filter(
            content_type=content_type,
            object_id=rma_id
        ).select_related('user')
        
        # Filter out admin-only field changes for non-admin users
        role_level = getattr(self.request.user, 'role_level', 0)
        if role_level < 100:
            admin_fields = [
                'root_cause', 'parts_replaced', 'cost_to_repair', 'device_mac',
                'return_tracking_number',
                'qa_reflashed', 'qa_image_version', 'qa_nvme_data_ok',
                'qa_services_ok', 'qa_uptime_ok', 'qa_stream_uptime_ok', 'qa_lens_control_ok',
                'rejection_reason',
            ]
            queryset = queryset.exclude(field_name__in=admin_fields)
        
        return queryset
