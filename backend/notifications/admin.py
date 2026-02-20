from django.contrib import admin
from .models import StateTimeout, StaleRMARecord


@admin.register(StateTimeout)
class StateTimeoutAdmin(admin.ModelAdmin):
    list_display = ['state', 'priority', 'timeout_hours']
    list_filter = ['state', 'priority']
    ordering = ['state', 'priority']
    
    fieldsets = (
        (None, {
            'fields': ('state', 'priority', 'timeout_hours'),
            'description': 'Configure how long an RMA can remain in each state/priority before being flagged as stale.'
        }),
    )


@admin.register(StaleRMARecord)
class StaleRMARecordAdmin(admin.ModelAdmin):
    list_display = ['rma', 'state', 'marked_stale_at', 'notification_sent', 'resolved']
    list_filter = ['state', 'notification_sent', 'resolved', 'marked_stale_at']
    readonly_fields = ['marked_stale_at']
    search_fields = ['rma__rma_number', 'rma__serial_number']
    ordering = ['-marked_stale_at']
