"""
Admin interface for WebAuthn credentials.
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import WebAuthnCredential, WebAuthnChallenge


@admin.register(WebAuthnCredential)
class WebAuthnCredentialAdmin(admin.ModelAdmin):
    list_display = ['user', 'name', 'created_at', 'last_used', 'sign_count']
    list_filter = ['created_at', 'last_used']
    search_fields = ['user__username', 'user__email', 'name']
    readonly_fields = ['credential_id', 'public_key', 'sign_count', 'aaguid', 'created_at', 'last_used']
    
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'name')
        }),
        ('Credential Data', {
            'fields': ('credential_id', 'public_key', 'sign_count', 'aaguid', 'transports')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'last_used')
        }),
    )


@admin.register(WebAuthnChallenge)
class WebAuthnChallengeAdmin(admin.ModelAdmin):
    list_display = ['user', 'challenge_type', 'created_at', 'is_expired_display']
    list_filter = ['is_registration', 'created_at']
    search_fields = ['user__username', 'session_key']
    readonly_fields = ['user', 'challenge', 'session_key', 'is_registration', 'created_at']
    
    def challenge_type(self, obj):
        return "Registration" if obj.is_registration else "Authentication"
    challenge_type.short_description = 'Type'
    
    def is_expired_display(self, obj):
        if obj.is_expired():
            return format_html('<span style="color: red;">✗ Expired</span>')
        return format_html('<span style="color: green;">✓ Valid</span>')
    is_expired_display.short_description = 'Status'
