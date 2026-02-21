# SSO Testing Guide for RMAinator

This guide will walk you through setting up and testing SSO authentication with Google (easiest to start with).

## Prerequisites

- Running RMAinator locally (backend on :8000, frontend on :5173)
- A Google account
- About 10 minutes

---

## Part 1: Google OAuth Setup (5 minutes)

### Step 1: Go to Google Cloud Console

1. Open https://console.cloud.google.com/
2. Sign in with your Google account
3. Click **"Select a project"** dropdown at the top
4. Click **"NEW PROJECT"**

### Step 2: Create a Project

1. Project name: `RMAinator-Dev` (or whatever you like)
2. Click **"CREATE"**
3. Wait for the project to be created (~30 seconds)
4. Make sure your new project is selected in the dropdown

### Step 3: Enable Google+ API (Required for OAuth)

1. In the search bar at the top, type: `Google+ API`
2. Click on **"Google+ API"** in the results
3. Click **"ENABLE"**
4. Wait for it to enable

### Step 4: Create OAuth Credentials

1. In the left sidebar, click **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"OAuth client ID"**

### Step 5: Configure OAuth Consent Screen (First Time Only)

If prompted to configure consent screen:

1. Click **"CONFIGURE CONSENT SCREEN"**
2. Select **"External"** (for testing)
3. Click **"CREATE"**
4. Fill in required fields:
   - App name: `RMAinator`
   - User support email: [your email]
   - Developer contact: [your email]
5. Click **"SAVE AND CONTINUE"**
6. Click **"SAVE AND CONTINUE"** again (skip scopes)
7. Click **"SAVE AND CONTINUE"** again (skip test users)
8. Click **"BACK TO DASHBOARD"**

### Step 6: Create OAuth Client ID

1. Go back to **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Application type: **"Web application"**
4. Name: `RMAinator Local`
5. Under **"Authorized redirect URIs"**, click **"+ ADD URI"**
6. Enter exactly: `http://localhost:8000/api/auth/google/login/callback/`
   - ⚠️ **Important**: Must include the trailing slash!
   - ⚠️ **Note**: It's `/login/callback/` not just `/callback/`
7. Click **"CREATE"**

### Step 7: Copy Your Credentials

You'll see a popup with:
- **Client ID**: Something like `123456-abc.apps.googleusercontent.com`
- **Client secret**: Something like `GOCSPX-abc123...`

**Keep this window open** or click **"DOWNLOAD JSON"** to save them.

---

## Part 2: Configure RMAinator Backend (2 minutes)

### Step 1: Update .env File

Open `backend/.env` and add your Google credentials:

```bash
# Replace with your actual values from Google Cloud Console
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```

### Step 2: Restart Backend Server

Stop your backend server (Ctrl+C) and restart it:

```bash
cd backend
python manage.py runserver
```

Watch for any errors in the console.

---

## Part 3: Enable SSO Buttons in Frontend (1 minute)

### Step 1: Uncomment SSO Buttons

Open `frontend/src/pages/Login.jsx` and find the commented SSO section (around line 82).

**Remove the comment markers** `{/*` and `*/}`:

**Before:**
```jsx
{/* SSO buttons - uncomment after configuring providers in backend/.env */}
{/*
<div style={styles.divider}>
  ...
</div>
*/}
```

**After:**
```jsx
{/* SSO buttons - configured! */}
<div style={styles.divider}>
  <div style={styles.dividerLine}></div>
  <span style={styles.dividerText}>OR</span>
  <div style={styles.dividerLine}></div>
</div>

<div style={styles.ssoButtons}>
  <button
    onClick={() => handleSSOLogin('google')}
    style={{...styles.ssoButton, ...styles.googleButton}}
    disabled={loading}
  >
    <span style={styles.ssoIcon}>🔐</span>
    Sign in with Google
  </button>
  
  {/* Keep Microsoft, Auth0, Okta commented for now */}
</div>
```

**Or just uncomment the Google button only for now.**

### Step 2: Save and Check Frontend

The frontend should automatically reload. Check http://localhost:5173/login - you should see the Google sign-in button!

---

## Part 4: Test SSO Login (2 minutes)

### Step 1: Click "Sign in with Google"

1. Go to http://localhost:5173/login
2. Click the **"Sign in with Google"** button
3. You'll be redirected to Google's login page

### Step 2: Sign In with Google

1. Select your Google account
2. You might see a warning "This app isn't verified" - this is normal for development
3. Click **"Continue"** or **"Advanced"** → **"Go to RMAinator (unsafe)"**
4. Review permissions and click **"Allow"**

### Step 3: Redirected Back

You should be redirected to `http://localhost:5173/auth/callback` which will:
1. Show "Processing..." message
2. Then either:
   - ✅ Redirect to `/dashboard` if everything works
   - ❌ Show an error message

---

## Expected Results

### First Time SSO User

1. Your Google account is linked to a new RMAinator account
2. **You'll see "Account pending admin approval"** error
3. This is correct! New SSO users need admin approval

### Admin Approval Process

1. Log in as admin at http://localhost:8000/admin/
2. Go to **Users** → **Users**
3. You should see your new SSO user with:
   - Email from Google
   - `is_verified = False` (unchecked)
4. Edit the user:
   - Check ✅ **"Is verified"**
   - Save
5. Now try logging in with Google again - should work!

### Subsequent Logins

After approval, clicking "Sign in with Google" should:
1. Redirect to Google
2. Immediately redirect back (no login prompt)
3. Take you to the dashboard

---

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Problem**: The redirect URI doesn't match what's configured in Google Console.

**Solution**:
1. Go back to Google Cloud Console → Credentials
2. Edit your OAuth client
3. Make sure you have EXACTLY: `http://localhost:8000/api/auth/google/login/callback/`
4. Including the trailing slash!
5. Note: It's `/login/callback/` not just `/callback/`

### Error: "Access blocked: This app's request is invalid"

**Problem**: Google+ API isn't enabled.

**Solution**:
1. Go to Google Cloud Console
2. Search for "Google+ API"
3. Click "ENABLE"

### Error: "Account pending admin approval"

**This is correct!** Follow the "Admin Approval Process" above.

### Backend Error: "Cannot import name 'Provider'"

**Problem**: Backend needs restart after env changes.

**Solution**:
```bash
cd backend
python manage.py runserver
```

### Frontend doesn't show Google button

**Problem**: SSO buttons still commented out.

**Solution**: 
- Make sure you uncommented the code in `Login.jsx`
- Check browser console for JavaScript errors

### Redirect goes to wrong URL

**Problem**: Frontend/backend URL mismatch.

**Solution**:
- Check `backend/.env`: `WEBAUTHN_ORIGIN=http://localhost:5173`
- Check Django Sites: Should be `localhost:5173`

---

## Testing Checklist

- [ ] Created Google Cloud project
- [ ] Enabled Google+ API
- [ ] Created OAuth credentials with correct redirect URI
- [ ] Added credentials to `backend/.env`
- [ ] Restarted backend server
- [ ] Uncommented SSO button in frontend
- [ ] Can see Google button on login page
- [ ] Clicked button and was redirected to Google
- [ ] Signed in with Google successfully
- [ ] Was redirected back to RMAinator
- [ ] Got "pending approval" message (expected for first time)
- [ ] Logged in as admin and approved the user
- [ ] Tried Google login again and got to dashboard ✅

---

## What's Happening Behind the Scenes

### The OAuth Flow

1. **User clicks "Sign in with Google"**
   - Frontend redirects to: `http://localhost:8000/api/auth/google/login/`

2. **Backend redirects to Google**
   - django-allauth generates OAuth URL
   - Includes your client_id and redirect_uri
   - User sees Google login screen

3. **User authorizes**
   - Google redirects to: `http://localhost:8000/api/auth/google/callback/?code=...`
   - Backend exchanges code for access token
   - Backend fetches user info from Google
   - Backend creates/updates user account

4. **Backend creates session**
   - Sets session cookie
   - Frontend callback page fetches user data
   - Stores in localStorage
   - Redirects to dashboard

### Security Notes

- OAuth tokens are handled entirely by the backend
- Frontend only gets a session cookie
- User's Google password is never sent to RMAinator
- Tokens are validated by Google, not us

---

## Next Steps

Once Google SSO is working:

1. **Test with another Google account** to verify the approval flow
2. **Set up Microsoft SSO** (similar process, use Azure Portal)
3. **Set up Auth0** (more advanced, requires Auth0 account)
4. **Set up Okta** (requires Okta developer account)

Need help with any of these? Just ask!

---

## Quick Reference

### Important URLs

- **Google Cloud Console**: https://console.cloud.google.com/
- **Frontend Login**: http://localhost:5173/login
- **Backend Admin**: http://localhost:8000/admin/
- **OAuth Redirect URI**: `http://localhost:8000/api/auth/google/login/callback/`

### Key Files

- **Backend Config**: `backend/.env`
- **Frontend Login**: `frontend/src/pages/Login.jsx`
- **Backend Settings**: `backend/rmainator/settings.py` (lines 232-262)
- **SSO Callback**: `frontend/src/pages/SSOCallback.jsx`

### Useful Commands

```bash
# Check backend logs
cd backend && python manage.py runserver

# Check if env loaded
cd backend && python manage.py shell -c "import os; print(os.environ.get('GOOGLE_CLIENT_ID'))"

# Clear browser cookies (if stuck)
# Open DevTools → Application → Cookies → Delete all
```
