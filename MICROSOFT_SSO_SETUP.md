# Microsoft SSO Setup Guide for RMAinator

This guide walks you through setting up Microsoft OAuth (Azure AD / Microsoft Entra ID) authentication.

## Prerequisites

- Running RMAinator locally (backend on :8000, frontend on :5173)
- A Microsoft account (can be personal or work/school)
- About 15 minutes

---

## Part 1: Register Application in Azure Portal (10 minutes)

### Step 1: Go to Azure Portal

1. Open https://portal.azure.com/
2. Sign in with your Microsoft account
3. In the search bar at the top, type: **"App registrations"**
4. Click **"App registrations"** (under Services)

### Step 2: Create a New App Registration

1. Click **"+ New registration"** at the top
2. Fill in the form:
   - **Name**: `RMAinator Local Dev`
   - **Supported account types**: Select **"Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)"**
     - This allows both personal Microsoft accounts AND work/school accounts
   - **Redirect URI**: 
     - Platform: **Web**
     - URI: `http://localhost:8000/api/auth/microsoft/login/callback/`
     - ⚠️ **Important**: Must include the trailing slash!
3. Click **"Register"**

### Step 3: Copy Application (client) ID

After registration, you'll see the app overview page:

1. Look for **"Application (client) ID"** near the top
2. It looks like: `12345678-1234-1234-1234-123456789abc`
3. **Copy this ID** - you'll need it for the `.env` file

### Step 4: Create a Client Secret

1. In the left sidebar, click **"Certificates & secrets"**
2. Click the **"Client secrets"** tab
3. Click **"+ New client secret"**
4. Fill in:
   - **Description**: `RMAinator Local Dev Secret`
   - **Expires**: Choose **"180 days (6 months)"** or **"Custom"** for testing
5. Click **"Add"**
6. ⚠️ **IMPORTANT**: Copy the **"Value"** (not the "Secret ID") immediately!
   - It looks like: `abc123~DEF456.GHI789_jkl012`
   - **You can only see this once!** If you navigate away, you'll need to create a new secret.

### Step 5: Configure API Permissions (Optional but Recommended)

1. In the left sidebar, click **"API permissions"**
2. You should see these default permissions:
   - Microsoft Graph → User.Read (Delegated)
3. This is sufficient for basic login. If you want more profile data:
   - Click **"+ Add a permission"**
   - Select **"Microsoft Graph"**
   - Select **"Delegated permissions"**
   - Search for and add:
     - `email` (if not already present)
     - `profile` (if not already present)
4. Click **"Add permissions"**

### Step 6: Enable Public Client Flow (Optional)

This isn't needed for web apps, but if you get errors:

1. In the left sidebar, click **"Authentication"**
2. Scroll to **"Advanced settings"**
3. Under **"Allow public client flows"**, set to **"Yes"**
4. Click **"Save"** at the top

---

## Part 2: Configure RMAinator Backend (2 minutes)

### Step 1: Update .env File

Open `backend/.env` and add your Microsoft credentials:

```bash
# Microsoft OAuth2
MICROSOFT_CLIENT_ID=YOUR_APPLICATION_CLIENT_ID_HERE
MICROSOFT_CLIENT_SECRET=YOUR_CLIENT_SECRET_VALUE_HERE
```

Replace with your actual values from Azure Portal.

### Step 2: Restart Backend Server

Stop your backend server (Ctrl+C) and restart it:

```bash
cd backend
python manage.py runserver
```

Watch for any errors in the console.

---

## Part 3: Enable Microsoft SSO Button in Frontend (1 minute)

### Step 1: Uncomment Microsoft Button

Open `frontend/src/pages/Login.jsx` and find the Microsoft SSO button (around line 101).

**Uncomment the Microsoft button block:**

```jsx
<button
  onClick={() => handleSSOLogin('microsoft')}
  style={{...styles.ssoButton, ...styles.microsoftButton}}
  disabled={loading}
>
  <span style={styles.ssoIcon}>🔐</span>
  Sign in with Microsoft
</button>
```

### Step 2: Save and Check Frontend

The frontend should automatically reload. Check http://localhost:5173/login - you should see both Google and Microsoft sign-in buttons!

---

## Part 4: Test Microsoft SSO Login (2 minutes)

### Step 1: Click "Sign in with Microsoft"

1. Go to http://localhost:5173/login
2. Click the **"Sign in with Microsoft"** button
3. You'll be redirected to Microsoft's login page

### Step 2: Sign In with Microsoft

1. Enter your Microsoft account email
2. Enter your password
3. If using a work/school account, you might need approval from your IT admin
4. You may see a permissions consent screen - click **"Accept"**

### Step 3: Redirected Back

You should be redirected to `http://localhost:5173/auth/callback` which will:
1. Show "Processing..." message
2. Then either:
   - ✅ Show "Account Pending Approval" (expected for first-time users)
   - ✅ Redirect to `/dashboard` (if you've already been approved)

---

## Expected Results

### First Time Microsoft SSO User

1. Your Microsoft account is linked to a new RMAinator account
2. **You'll see "Account Pending Approval"** message with instructions
3. This is correct! New SSO users need admin approval

### Admin Approval Process

1. Run this command to approve the user:
   ```bash
   cd backend
   python manage.py shell -c "from users.models import User; u = User.objects.filter(email='YOUR_MICROSOFT_EMAIL').first(); u.is_verified = True; u.save(); print(f'Approved {u.username}!')"
   ```

Or via Django admin:
1. Log in as admin at http://localhost:8000/admin/
2. Go to **Users** → **Users**
3. Find your Microsoft SSO user
4. Edit and check ✅ **"Is verified"**
5. Save

### Subsequent Logins

After approval, clicking "Sign in with Microsoft" should:
1. Redirect to Microsoft
2. Immediately redirect back (no login prompt if already signed in to Microsoft)
3. Take you to the dashboard

---

## Troubleshooting

### Error: "AADSTS50011: The redirect URI specified in the request does not match"

**Problem**: The redirect URI in Azure doesn't match what django-allauth is sending.

**Solution**:
1. Go to Azure Portal → App registrations → Your app
2. Click **"Authentication"** in the left sidebar
3. Under **"Web"** → **"Redirect URIs"**, verify you have EXACTLY:
   ```
   http://localhost:8000/api/auth/microsoft/login/callback/
   ```
4. Make sure it includes the trailing slash!
5. Click **"Save"**

### Error: "AADSTS7000215: Invalid client secret provided"

**Problem**: The client secret is incorrect or expired.

**Solution**:
1. Go to Azure Portal → App registrations → Your app
2. Click **"Certificates & secrets"**
3. Create a new client secret
4. Update `backend/.env` with the new secret
5. Restart backend server

### Error: "AADSTS700016: Application not found in the directory"

**Problem**: The Application (client) ID is incorrect.

**Solution**:
1. Go to Azure Portal → App registrations → Your app
2. Copy the **"Application (client) ID"** from the Overview page
3. Update `backend/.env` with the correct ID
4. Restart backend server

### Frontend doesn't show Microsoft button

**Problem**: Button still commented out or JavaScript error.

**Solution**: 
- Make sure you uncommented the code in `Login.jsx`
- Check browser console (F12) for JavaScript errors
- Make sure you saved the file

### "Account pending approval" error

**This is correct!** Follow the "Admin Approval Process" above to approve the user.

### Microsoft login redirects to wrong URL

**Problem**: Frontend/backend URL mismatch.

**Solution**:
- Check `backend/.env`: `WEBAUTHN_ORIGIN=http://localhost:5173`
- Check Azure redirect URI: Must be `http://localhost:8000/api/auth/microsoft/login/callback/`

---

## Testing Checklist

- [ ] Created Azure app registration
- [ ] Set redirect URI to `http://localhost:8000/api/auth/microsoft/login/callback/`
- [ ] Copied Application (client) ID
- [ ] Created and copied client secret
- [ ] Added credentials to `backend/.env`
- [ ] Restarted backend server
- [ ] Uncommented Microsoft button in `Login.jsx`
- [ ] Can see Microsoft button on login page
- [ ] Clicked button and was redirected to Microsoft
- [ ] Signed in with Microsoft successfully
- [ ] Was redirected back to RMAinator
- [ ] Got "pending approval" message (expected for first time)
- [ ] Approved the user (via command or admin)
- [ ] Tried Microsoft login again and got to dashboard ✅

---

## Differences from Google SSO

| Feature | Google | Microsoft |
|---------|--------|-----------|
| Setup Portal | Google Cloud Console | Azure Portal |
| API to Enable | Google+ API | None (enabled by default) |
| Account Types | Personal Gmail only | Personal, Work, School |
| Consent Screen | Required | Built-in |
| Secret Expiration | Never | 6-24 months |
| Redirect URI Path | `/google/login/callback/` | `/microsoft/login/callback/` |

---

## What's Happening Behind the Scenes

### The Microsoft OAuth Flow

1. **User clicks "Sign in with Microsoft"**
   - Frontend redirects to: `http://localhost:8000/api/auth/microsoft/login/`

2. **Backend redirects to Microsoft**
   - django-allauth generates OAuth URL with your client_id
   - User sees Microsoft login screen

3. **User authorizes**
   - Microsoft redirects to: `http://localhost:8000/api/auth/microsoft/login/callback/?code=...`
   - Backend exchanges code for access token
   - Backend fetches user info from Microsoft Graph API
   - Backend creates/updates user account

4. **Backend issues JWT tokens**
   - Checks if user is verified
   - If verified: generates JWT tokens, redirects to frontend with tokens
   - If not verified: redirects with error message

5. **Frontend completes login**
   - Stores JWT tokens in localStorage
   - Redirects to dashboard

### Security Notes

- OAuth tokens are handled entirely by the backend
- Frontend only receives JWT tokens
- User's Microsoft password is never sent to RMAinator
- Tokens are validated by Microsoft, not us
- Client secret should be kept secure and rotated periodically

---

## Next Steps

Once Microsoft SSO is working:

1. **Test with a work/school Microsoft account** to verify organizational accounts work
2. **Set up Auth0 SSO** (requires Auth0 account - more advanced)
3. **Set up Okta SSO** (requires Okta developer account)

Need help with any of these? Just ask!

---

## Quick Reference

### Important URLs

- **Azure Portal**: https://portal.azure.com/
- **App Registrations**: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
- **Frontend Login**: http://localhost:5173/login
- **Backend Admin**: http://localhost:8000/admin/
- **OAuth Redirect URI**: `http://localhost:8000/api/auth/microsoft/login/callback/`

### Key Files

- **Backend Config**: `backend/.env`
- **Frontend Login**: `frontend/src/pages/Login.jsx`
- **Backend Settings**: `backend/rmainator/settings.py` (lines 247-251)
- **SSO Callback**: `frontend/src/pages/SSOCallback.jsx`

### Useful Commands

```bash
# Check backend logs
cd backend && python manage.py runserver

# Check if env loaded
cd backend && python manage.py shell -c "import os; print(os.environ.get('MICROSOFT_CLIENT_ID'))"

# Approve user via command line
cd backend && python manage.py shell -c "from users.models import User; u = User.objects.filter(email='user@example.com').first(); u.is_verified = True; u.save(); print('Approved!')"

# List all SSO users
cd backend && python manage.py shell -c "from users.models import User; from allauth.socialaccount.models import SocialAccount; for sa in SocialAccount.objects.all(): print(f'{sa.provider}: {sa.user.username} ({sa.user.email}) - verified={sa.user.is_verified}')"
```
