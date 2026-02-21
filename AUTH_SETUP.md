# Authentication Setup Guide

RMAinator now supports multiple authentication methods:
- Traditional username/password
- Two-Factor Authentication (TOTP/2FA)
- Hardware Security Keys (WebAuthn/FIDO2)
- Single Sign-On (SSO) via OAuth2/OIDC

## WebAuthn Configuration

WebAuthn is already configured for local development. The settings are in `backend/.env`:

```bash
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_NAME=RMAinator
WEBAUTHN_ORIGIN=http://localhost:5173
```

### Browser Support
- Chrome/Edge (recommended)
- Firefox
- Safari 13+

### Compatible Authenticators
- Platform authenticators (Touch ID, Windows Hello, Face ID)
- USB security keys (YubiKey, Titan, etc.)
- Bluetooth/NFC authenticators

## TOTP/2FA Setup

Two-factor authentication is available through any TOTP authenticator app:
- Google Authenticator
- Authy
- Microsoft Authenticator
- 1Password
- Any RFC 6238 compatible app

Users can enable 2FA from their Profile page after logging in.

## SSO Provider Setup

SSO is optional. If you want to enable it, you need to register your application with each provider and add credentials to `backend/.env`.

### Google OAuth2

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Set authorized redirect URI: `http://localhost:8000/api/auth/google/callback/`
6. Add credentials to `.env`:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

### Microsoft OAuth2

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to Azure Active Directory → App Registrations
3. Click "New registration"
4. Set redirect URI: `http://localhost:8000/api/auth/microsoft/callback/`
5. Generate client secret in Certificates & Secrets
6. Add credentials to `.env`:
   ```bash
   MICROSOFT_CLIENT_ID=your-application-id
   MICROSOFT_CLIENT_SECRET=your-client-secret
   ```

### Auth0

1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. Create a new application (Regular Web Application)
3. Set Allowed Callback URLs: `http://localhost:8000/api/auth/auth0/callback/`
4. Add credentials to `.env`:
   ```bash
   AUTH0_CLIENT_ID=your-client-id
   AUTH0_CLIENT_SECRET=your-client-secret
   AUTH0_URL=https://your-domain.auth0.com
   ```

### Okta

1. Go to [Okta Developer Console](https://developer.okta.com/)
2. Create a new Web Application
3. Set Sign-in redirect URI: `http://localhost:8000/api/auth/okta/callback/`
4. Add credentials to `.env`:
   ```bash
   OKTA_CLIENT_ID=your-client-id
   OKTA_CLIENT_SECRET=your-client-secret
   OKTA_BASE_URL=https://your-domain.okta.com
   ```

## Production Configuration

For production deployment, update these settings:

1. **Domain Configuration**
   - Update `WEBAUTHN_RP_ID` to your domain (e.g., `rmainator.com`)
   - Update `WEBAUTHN_ORIGIN` to your frontend URL (e.g., `https://rmainator.com`)
   - Update Django Site object: `python manage.py shell -c "from django.contrib.sites.models import Site; site = Site.objects.get(id=1); site.domain = 'your-domain.com'; site.save()"`

2. **OAuth Redirect URIs**
   - Update all SSO provider redirect URIs to use your production domain
   - Use HTTPS for all production redirect URIs

3. **Security**
   - Set `DEBUG=False` in production
   - Change `SECRET_KEY` to a unique value
   - Use environment variables or secure secret management
   - Enable HTTPS/TLS

## User Flow

### First-Time SSO Users
1. Click SSO provider button on login page
2. Authenticate with provider
3. Account created but **not verified**
4. Admin must approve user in Admin panel
5. User receives notification when approved

### Enabling 2FA
1. Log in to account
2. Navigate to Profile page
3. Click "Enable 2FA"
4. Scan QR code with authenticator app
5. Enter 6-digit code to verify
6. 2FA is now required for all logins

### Adding Security Key
1. Log in to account
2. Navigate to Profile page
3. Click "Add Security Key"
4. Give key a name (e.g., "YubiKey", "Touch ID")
5. Follow browser prompts to register key
6. Key can now be used for passwordless login

## Testing

### Test WebAuthn (No Setup Required)
1. Start backend: `cd backend && python manage.py runserver`
2. Start frontend: `cd frontend && npm run dev`
3. Log in with existing account
4. Go to Profile → Add Security Key
5. Test with your device's platform authenticator (Touch ID, Windows Hello)

### Test TOTP (No Setup Required)
1. Log in with existing account
2. Go to Profile → Enable 2FA
3. Scan QR code with authenticator app
4. Enter verification code

### Test SSO (Requires Provider Setup)
1. Configure at least one SSO provider (see above)
2. Restart backend server
3. Click SSO provider button on login page
4. Should redirect to provider for authentication

## Troubleshooting

### WebAuthn Issues
- Ensure using HTTPS in production (required by WebAuthn spec)
- For localhost testing, HTTP is allowed
- Check browser console for errors
- Verify `WEBAUTHN_ORIGIN` matches your frontend URL exactly

### TOTP Issues
- Ensure device clock is synchronized (TOTP is time-based)
- QR code not displaying: Check backend logs for errors
- Invalid code: Try waiting for next 30-second window

### SSO Issues
- Verify redirect URIs match exactly (including trailing slashes)
- Check that provider credentials are correct in `.env`
- Ensure Django Site domain is configured correctly
- Review backend logs for OAuth errors
