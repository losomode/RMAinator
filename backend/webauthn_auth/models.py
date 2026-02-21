"""
Models for WebAuthn (FIDO2) passwordless authentication.
"""
from django.db import models
from django.conf import settings
from django.utils import timezone


class WebAuthnCredential(models.Model):
    """
    Stores a user's WebAuthn credential (security key, Touch ID, etc.)
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='webauthn_credentials'
    )
    
    # Credential data
    credential_id = models.BinaryField(unique=True, max_length=1024)
    public_key = models.BinaryField(max_length=1024)
    sign_count = models.PositiveIntegerField(default=0)
    
    # Metadata
    name = models.CharField(
        max_length=100,
        help_text="User-friendly name for this credential (e.g., 'MacBook Pro Touch ID', 'YubiKey 5')"
    )
    
    # Credential type info
    aaguid = models.BinaryField(max_length=16, null=True, blank=True)
    transports = models.JSONField(
        default=list,
        help_text="Supported transports (usb, nfc, ble, internal)"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'WebAuthn Credential'
        verbose_name_plural = 'WebAuthn Credentials'
    
    def __str__(self):
        return f"{self.user.username} - {self.name}"
    
    def mark_used(self, new_sign_count):
        """Update last_used timestamp and sign count."""
        self.sign_count = new_sign_count
        self.last_used = timezone.now()
        self.save(update_fields=['sign_count', 'last_used'])


class WebAuthnChallenge(models.Model):
    """
    Temporary storage for WebAuthn challenges during authentication.
    Challenges expire after 5 minutes.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="User for authentication, null for registration"
    )
    
    challenge = models.BinaryField(max_length=64)
    session_key = models.CharField(max_length=100, unique=True)
    
    # Challenge metadata
    is_registration = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['session_key']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        challenge_type = "Registration" if self.is_registration else "Authentication"
        username = self.user.username if self.user else "Anonymous"
        return f"{challenge_type} challenge for {username}"
    
    def is_expired(self):
        """Check if challenge is older than 5 minutes."""
        from datetime import timedelta
        expiry = timezone.now() - timedelta(minutes=5)
        return self.created_at < expiry
