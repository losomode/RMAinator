from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RMAListCreateView,
    RMADetailView,
    RMAStateUpdateView,
    RMAAttachmentUploadView,
    RMAAttachmentDeleteView,
    RMAGroupCreateView,
    RMAGroupDetailUpdateView,
    RMAGroupBulkStateView,
    RMASearchView,
    RMAAuditHistoryView,
)
from .dashboard import AdminDashboardView
from notifications.views import StateTimeoutViewSet

# Router for viewsets
router = DefaultRouter()
router.register(r'admin/stale-config', StateTimeoutViewSet, basename='stale-config')

app_name = 'rma'

urlpatterns = [
    # RMA CRUD
    path('', RMAListCreateView.as_view(), name='rma_list_create'),
    path('<int:pk>/', RMADetailView.as_view(), name='rma_detail'),

    # RMA state management
    path('<int:pk>/state/', RMAStateUpdateView.as_view(), name='rma_state_update'),

    # RMA audit history
    path('<int:pk>/audit/', RMAAuditHistoryView.as_view(), name='rma_audit_history'),

    # RMA attachments
    path('<int:pk>/attachments/', RMAAttachmentUploadView.as_view(), name='rma_attachment_upload'),
    path('attachments/<int:pk>/', RMAAttachmentDeleteView.as_view(), name='rma_attachment_delete'),

    # Group operations
    path('group/', RMAGroupCreateView.as_view(), name='rma_group_create'),
    path('group/<int:pk>/', RMAGroupDetailUpdateView.as_view(), name='rma_group_detail'),
    path('group/<int:pk>/bulk-state/', RMAGroupBulkStateView.as_view(), name='rma_group_bulk_state'),

    # Search and filtering
    path('search/', RMASearchView.as_view(), name='rma_search'),

    # Admin dashboard
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin_dashboard'),

    # Include router URLs for viewsets
    path('', include(router.urls)),
]
