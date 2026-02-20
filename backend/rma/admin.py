from django.contrib import admin
from .models import RMA, RMAGroup, RMAStateHistory, RMAAttachment


class RMAStateHistoryInline(admin.TabularInline):
    model = RMAStateHistory
    extra = 0
    readonly_fields = ['from_state', 'to_state', 'changed_by', 'changed_at']


class RMAAttachmentInline(admin.TabularInline):
    model = RMAAttachment
    extra = 0
    readonly_fields = ['filename', 'uploaded_by', 'uploaded_at', 'file_size']


@admin.register(RMA)
class RMAAdmin(admin.ModelAdmin):
    list_display = ['rma_number', 'serial_number', 'owner', 'state', 'priority', 'created_at']
    list_filter = ['state', 'priority', 'created_at']
    search_fields = ['rma_number', 'serial_number', 'owner__username', 'owner__email']
    readonly_fields = ['rma_number', 'created_at', 'updated_at', 'years_in_field']
    inlines = [RMAStateHistoryInline, RMAAttachmentInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('rma_number', 'owner', 'group', 'state', 'priority')
        }),
        ('Device Information', {
            'fields': ('serial_number', 'first_ship_date', 'fault_notes')
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at', 'rma_received_date', 'return_date', 'years_in_field')
        }),
        ('Technical Fields (Admin Only)', {
            'fields': ('root_cause', 'parts_replaced', 'cost_to_repair', 'tx2_mac',
                      'script_ran', 'services_enabled', 'uptime_good', 'stream_good', 'ship_ready')
        }),
        ('Rejection', {
            'fields': ('rejection_reason',)
        }),
    )


@admin.register(RMAGroup)
class RMAGroupAdmin(admin.ModelAdmin):
    list_display = ['id', 'created_by', 'created_at']
    readonly_fields = ['created_at']


@admin.register(RMAStateHistory)
class RMAStateHistoryAdmin(admin.ModelAdmin):
    list_display = ['rma', 'from_state', 'to_state', 'changed_by', 'changed_at']
    list_filter = ['to_state', 'changed_at']
    readonly_fields = ['from_state', 'to_state', 'changed_by', 'changed_at']


@admin.register(RMAAttachment)
class RMAAttachmentAdmin(admin.ModelAdmin):
    list_display = ['filename', 'rma', 'uploaded_by', 'uploaded_at', 'file_size']
    readonly_fields = ['uploaded_at']
