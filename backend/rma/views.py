from rest_framework import generics, status, views, filters
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.contrib.contenttypes.models import ContentType
from users.permissions import IsAdmin
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
        queryset = RMA.objects.select_related('owner').prefetch_related('attachments')
        
        # Non-admin users only see their own RMAs
        if not user.is_admin:
            queryset = queryset.filter(owner=user)
        
        # Filter by archived status
        archived = self.request.query_params.get('archived')
        if archived is not None:
            if archived.lower() == 'true':
                queryset = queryset.filter(state__in=[RMA.State.COMPLETED, RMA.State.REJECTED])
            else:
                queryset = queryset.exclude(state__in=[RMA.State.COMPLETED, RMA.State.REJECTED])
        
        return queryset


class RMADetailView(generics.RetrieveUpdateDestroyAPIView):
    """API endpoint to retrieve, update, or delete an RMA."""
    permission_classes = (IsAuthenticated,)
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return RMAUpdateSerializer
        return RMADetailSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = RMA.objects.select_related('owner').prefetch_related(
            'attachments', 'state_history', 'state_history__changed_by'
        )
        
        # Non-admin users only see their own RMAs
        if not user.is_admin:
            queryset = queryset.filter(owner=user)
        
        return queryset
    
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
            context={'rma': rma}
        )
        serializer.is_valid(raise_exception=True)
        
        # Update state
        rma._changed_by = request.user
        rma.state = serializer.validated_data['state']
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
        
        # Check permissions: users can only upload to their own RMAs
        if not request.user.is_admin and rma.owner != request.user:
            return Response(
                {'error': 'You do not have permission to upload to this RMA'},
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
        queryset = super().get_queryset()
        
        # Non-admin users can only delete attachments from their own RMAs
        if not user.is_admin:
            queryset = queryset.filter(rma__owner=user)
        
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


class RMASearchView(generics.ListAPIView):
    """API endpoint to search and filter RMAs (admin only)."""
    permission_classes = (IsAdmin,)
    serializer_class = RMAListSerializer
    
    def get_queryset(self):
        queryset = RMA.objects.select_related('owner').prefetch_related('attachments')
        
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
        
        # Check permissions: users can only view audit logs for their own RMAs
        if not self.request.user.is_admin and rma.owner != self.request.user:
            return AuditLog.objects.none()
        
        content_type = ContentType.objects.get_for_model(RMA)
        
        # Get all audit logs for this RMA
        queryset = AuditLog.objects.filter(
            content_type=content_type,
            object_id=rma_id
        ).select_related('user')
        
        # Filter out admin-only field changes for non-admin users
        if not self.request.user.is_admin:
            admin_fields = [
                'root_cause', 'parts_replaced', 'cost_to_repair', 'tx2_mac',
                'script_ran', 'services_enabled', 'uptime_good', 'stream_good',
                'ship_ready', 'rejection_reason'
            ]
            queryset = queryset.exclude(field_name__in=admin_fields)
        
        return queryset
