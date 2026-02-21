# SSO and WebAuthn Implementation Plan

## Overview
Adding Single Sign-On (SSO) and WebAuthn passwordless authentication to RMAinator.

## Packages Added
- **django-allauth 65.3.0**: Comprehensive authentication solution supporting social/enterprise SSO
- **webauthn 2.3.0**: Python library for WebAuthn (FIDO2) passwordless authentication

## Phase 1: Django Allauth Setup (SSO)

### Backend Changes

1. **Update INSTALLED_APPS** in `settings.py`:
   ```python
   INSTALLED_APPS = [
       # ... existing apps ...
       'django.contrib.sites',  # Required by allauth
       'allauth',
       'allauth.account',
       'allauth.socialaccount',
       # Social providers (choose which ones to support):
       'allauth.socialaccount.providers.google',
       'allauth.socialaccount.providers.microsoft',
       'allauth.socialaccount.providers.github',
       # ... local apps ...
   ]
   ```

2. **Add Authentication Backends**:
   ```python
   AUTHENTICATION_BACKENDS = [
       'django.contrib.auth.backends.ModelBackend',
       'allauth.account.auth_backends.AuthenticationBackend',
   ]
   ```

3. **Add Allauth Settings**:
   ```python
   SITE_ID = 1
   ACCOUNT_EMAIL_VERIFICATION = 'optional'
   SOCIALACCOUNT_AUTO_SIGNUP = False  # Require admin approval
   SOCIALACCOUNT_ADAPTER = 'users.adapters.CustomSocialAccountAdapter'
   ```

4. **Create Social Account Adapter** (`users/adapters.py`):
   - Override signup behavior to set `is_verified=False`
   - Map social account data to custom User model
   - Handle role assignment

5. **Update URLs**:
   ```python
   urlpatterns = [
       path('api/auth/', include('allauth.urls')),
       # ... existing patterns ...
   ]
   ```

### Frontend Changes

1. **Add SSO Login Buttons** to Login page:
   - Google
   - Microsoft  
   - GitHub
   - Each redirects to `/api/auth/<provider>/login/`

2. **Handle OAuth Callbacks**:
   - Capture tokens/user data from redirect
   - Store JWT tokens
   - Redirect to dashboard

## Phase 2: WebAuthn Implementation

### Backend Changes

1. **Create WebAuthn App**:
   ```bash
   python manage.py startapp webauthn_auth
   ```

2. **Create Models** (`webauthn_auth/models.py`):
   ```python
   class WebAuthnCredential(models.Model):
       user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='webauthn_credentials')
       credential_id = models.BinaryField(unique=True)
       public_key = models.BinaryField()
       sign_count = models.PositiveIntegerField(default=0)
       name = models.CharField(max_length=100)  # e.g., "MacBook Pro Touch ID"
       created_at = models.DateTimeField(auto_now_add=True)
       last_used = models.DateTimeField(null=True, blank=True)
   ```

3. **Create API Endpoints** (`webauthn_auth/views.py`):
   - `POST /api/auth/webauthn/register/begin/` - Start registration, return challenge
   - `POST /api/auth/webauthn/register/complete/` - Complete registration, store credential
   - `POST /api/auth/webauthn/login/begin/` - Start authentication, return challenge
   - `POST /api/auth/webauthn/login/complete/` - Verify credential, return JWT

4. **Implement Challenge Storage**:
   - Store challenges in cache/session
   - Expire after 5 minutes
   - Associate with user/session

### Frontend Changes

1. **Add WebAuthn Support Detection**:
   ```javascript
   const isWebAuthnSupported = window.PublicKeyCredential !== undefined;
   ```

2. **Registration Flow** (Profile page):
   - "Add Security Key" button
   - Call registration begin endpoint
   - Use `navigator.credentials.create()` with challenge
   - Send response to complete endpoint
   - Show list of registered keys

3. **Login Flow** (Login page):
   - "Sign in with Security Key" button (if supported)
   - Call login begin endpoint
   - Use `navigator.credentials.get()` with challenge
   - Send response to complete endpoint
   - Receive JWT tokens

4. **Install `@simplewebauthn/browser`**:
   ```bash
   npm install @simplewebauthn/browser
   ```

## Phase 3: Admin Configuration

1. **Social Application Management**:
   - Django admin interface for allauth already provides this
   - Add client IDs/secrets for each provider

2. **WebAuthn Settings**:
   - Enable/disable WebAuthn
   - Configure RP ID and RP name
   - Set attestation preferences

## Phase 4: Security Considerations

1. **Admin Approval Workflow**:
   - Keep existing approval for SSO users
   - New users from SSO start as `is_verified=False`

2. **Multi-Factor Options**:
   - Allow users to have both password and WebAuthn
   - Allow users to have both SSO and password

3. **Credential Management**:
   - Users can register multiple WebAuthn credentials
   - Users can revoke credentials
   - Show last used timestamps

## Phase 5: Testing Requirements

1. **SSO Testing**:
   - Test each provider (Google, Microsoft, GitHub)
   - Test new user signup flow
   - Test existing user linking
   - Test admin approval workflow

2. **WebAuthn Testing**:
   - Test on different browsers (Chrome, Firefox, Safari, Edge)
   - Test different authenticator types (Touch ID, YubiKey, Windows Hello)
   - Test registration and authentication flows
   - Test credential revocation

3. **Integration Testing**:
   - Ensure existing username/password auth still works
   - Test JWT token issuance for all auth methods
   - Test permission systems with new auth methods

## Configuration Example

### Environment Variables (.env):
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-app-id
MICROSOFT_CLIENT_SECRET=your-secret

# GitHub OAuth
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-secret

# WebAuthn
WEBAUTHN_RP_ID=rmainator.yourdomain.com
WEBAUTHN_RP_NAME=RMAinator
WEBAUTHN_ORIGIN=https://rmainator.yourdomain.com
```

## Migration Strategy

1. **Backward Compatibility**:
   - Existing users can continue using username/password
   - SSO and WebAuthn are additional options, not replacements

2. **Gradual Rollout**:
   - Phase 1: Add SSO for new users
   - Phase 2: Add WebAuthn for existing users
   - Phase 3: Optionally make password optional if user has WebAuthn

## Documentation Updates

1. **User Documentation**:
   - How to sign in with SSO
   - How to register security keys
   - Browser/device requirements for WebAuthn

2. **Admin Documentation**:
   - How to configure OAuth providers
   - How to get client IDs and secrets
   - Security best practices

## Estimated Effort

- **SSO Implementation**: ~8-12 hours
- **WebAuthn Implementation**: ~12-16 hours
- **Testing**: ~4-6 hours
- **Documentation**: ~2-4 hours
- **Total**: ~26-38 hours

## Questions to Resolve

1. Which SSO providers to support? (Google, Microsoft, GitHub, others?)
2. Should WebAuthn be optional or required for certain users?
3. Should we allow password reset via SSO email?
4. Do we want MFA with TOTP in addition to WebAuthn?
5. Should admins bypass approval for certain email domains?

## Next Steps

1. Review and approve this plan
2. Decide which SSO providers to support
3. Set up OAuth applications with chosen providers
4. Implement Phase 1 (SSO)
5. Implement Phase 2 (WebAuthn)
6. Test thoroughly
7. Update documentation
