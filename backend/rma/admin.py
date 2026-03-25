from django.contrib import admin
from django.utils.html import format_html
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
    list_display = ['rma_number', 'serial_number', 'owner', 'state_badge', 'priority_badge', 'created_at', 'updated_at']
    list_filter = ['state', 'priority', 'created_at', 'owner']
    search_fields = ['rma_number', 'serial_number', 'owner__username', 'owner__email', 'fault_notes']
    readonly_fields = ['rma_number', 'created_at', 'updated_at', 'years_in_field']
    inlines = [RMAStateHistoryInline, RMAAttachmentInline]
    list_per_page = 50
    date_hierarchy = 'created_at'
    list_select_related = ['owner', 'group']
    
    def state_badge(self, obj):
        if not obj or not hasattr(obj, 'state'):
            return '-'
        colors = {
            'SUBMITTED': '#FFA500',
            'APPROVED': '#28A745',
            'REJECTED': '#DC3545',
            'RECEIVED': '#17A2B8',
            'DIAGNOSED': '#6C757D',
            'REPAIRED': '#007BFF',
            'REPLACED': '#007BFF',
            'IN_QA': '#8B5CF6',
            'READY_FOR_RETURN': '#F59E0B',
            'SHIPPED': '#28A745',
            'COMPLETED': '#6C757D',
        }
        color = colors.get(obj.state, '#999999')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-weight: bold;">{}</span>',
            color, obj.get_state_display()
        )
    state_badge.short_description = 'State'
    state_badge.admin_order_field = 'state'
    
    def priority_badge(self, obj):
        if not obj or not hasattr(obj, 'priority'):
            return '-'
        colors = {
            'HIGH': '#DC3545',
            'NORMAL': '#FFC107',
            'LOW': '#6C757D',
        }
        color = colors.get(obj.priority, '#999999')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-size: 11px;">{}</span>',
            color, obj.get_priority_display()
        )
    priority_badge.short_description = 'Priority'
    priority_badge.admin_order_field = 'priority'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('rma_number', 'owner', 'group', 'state', 'priority', 'company_id')
        }),
        ('Device Information (Customer-Submitted)', {
            'fields': ('serial_number', 'device_type', 'ipn', 'fault_notes')
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at', 'first_ship_date', 'rma_received_date', 'return_date', 'years_in_field')
        }),
        ('Technical Fields (Admin Only)', {
            'fields': ('root_cause', 'parts_replaced', 'cost_to_repair', 'device_mac', 'return_tracking_number')
        }),
        ('Repair QA Checklist (Admin Only)', {
            'fields': ('qa_reflashed', 'qa_image_version', 'qa_nvme_data_ok', 'qa_services_ok',
                       'qa_uptime_ok', 'qa_stream_uptime_ok', 'qa_lens_control_ok', 'repair_notes')
        }),
        ('Rejection', {
            'fields': ('rejection_reason',)
        }),
    )


@admin.register(RMAGroup)
class RMAGroupAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'company_id', 'created_by', 'created_at']
    readonly_fields = ['created_at']
    search_fields = ['name', 'created_by__username']


@admin.register(RMAStateHistory)
class RMAStateHistoryAdmin(admin.ModelAdmin):
    list_display = ['rma', 'from_state', 'to_state', 'changed_by', 'changed_at']
    list_filter = ['to_state', 'changed_at']
    readonly_fields = ['from_state', 'to_state', 'changed_by', 'changed_at']


@admin.register(RMAAttachment)
class RMAAttachmentAdmin(admin.ModelAdmin):
    list_display = ['filename', 'rma', 'uploaded_by', 'uploaded_at', 'file_size']
    readonly_fields = ['uploaded_at']
