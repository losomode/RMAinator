"""
URL configuration for WebAuthn endpoints.
"""
from django.urls import path
from .views import (
    WebAuthnRegistrationBeginView,
    WebAuthnRegistrationCompleteView,
    WebAuthnCredentialListView,
    WebAuthnCredentialDeleteView,
)

app_name = 'webauthn_auth'

urlpatterns = [
    # Registration endpoints
    path('webauthn/register/begin/', WebAuthnRegistrationBeginView.as_view(), name='register_begin'),
    path('webauthn/register/complete/', WebAuthnRegistrationCompleteView.as_view(), name='register_complete'),
    
    # Credential management
    path('webauthn/credentials/', WebAuthnCredentialListView.as_view(), name='credential_list'),
    path('webauthn/credentials/<int:credential_id>/', WebAuthnCredentialDeleteView.as_view(), name='credential_delete'),
]
