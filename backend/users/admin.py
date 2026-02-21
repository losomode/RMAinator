from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'full_name', 'role_badge', 'verified_badge', 'is_active', 'date_joined']
    list_filter = ['role', 'is_verified', 'is_active', 'is_staff']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    
    def full_name(self, obj):
        if obj.first_name and obj.last_name:
            return f"{obj.first_name} {obj.last_name}"
        elif obj.first_name:
            return obj.first_name
        elif obj.last_name:
            return obj.last_name
        return "-"
    full_name.short_description = 'Full Name'
    
    def role_badge(self, obj):
        if not obj or not hasattr(obj, 'role'):
            return '-'
        color = '#17A2B8' if obj.role == 'ADMIN' else '#6C757D'
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-weight: bold; font-size: 11px;">{}</span>',
            color, obj.get_role_display()
        )
    role_badge.short_description = 'Role'
    role_badge.admin_order_field = 'role'
    
    def verified_badge(self, obj):
        if not obj:
            return '-'
        if obj.is_verified:
            return format_html(
                '<span style="color: #28A745; font-weight: bold;">{} Verified</span>',
                '✓'
            )
        return format_html(
            '<span style="color: #FFC107; font-weight: bold;">{} Pending</span>',
            '⏳'
        )
    verified_badge.short_description = 'Status'
    verified_badge.admin_order_field = 'is_verified'
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role', 'is_verified')}),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Custom Fields', {'fields': ('role', 'is_verified')}),
    )
