# RMAinator - RMA Device Tracking System

A comprehensive web application for tracking Return Merchandise Authorization (RMA) devices through their complete repair lifecycle.

## 🎯 Features

### User Features
- 🔐 **User Registration & Approval** - Register accounts with admin approval workflow
- 📦 **Multi-Device RMA Submission** - Submit one or multiple devices in a single request
- 📎 **File Attachments** - Attach photos, PDFs, and documents to RMAs
- 📊 **RMA Dashboard** - View active and archived RMAs with status updates
- 🔔 **Email Notifications** - Receive automatic notifications on RMA state changes
- 📜 **Audit History** - View complete history of RMA changes and status updates
- 🔍 **RMA Groups** - Track multiple devices submitted together

### Admin Features
- ✅ **User Approval** - Approve or reject new user registrations
- 🎛️ **RMA Management** - Search, filter, and manage all RMAs
- 🔄 **State Management** - Update RMA states through defined workflow
- 📈 **Admin Dashboard** - View metrics, trends, and recent activity
- ⚠️ **Stale RMA Detection** - Configurable timeout alerts for delayed RMAs
- 🔍 **Advanced Search** - Search by RMA#, serial number, owner, state, priority, date range
- 📝 **Technical Fields** - Update diagnostic info (TX2 MAC, scripts, services, etc.)
- 📧 **Admin Notifications** - Receive alerts for new RMAs, user registrations, and stale RMAs
- 🕐 **Audit Trail** - Complete field-level change history for all RMAs

## 🛠️ Technology Stack

- **Backend:** Django 6.0, Django REST Framework, SQLite
- **Frontend:** React 18, Vite, React Router
- **Authentication:** JWT (JSON Web Tokens)
- **Email:** Django email backend (console for dev, SMTP for prod)

## 📋 Prerequisites

- Python 3.10+
- Node.js 18+

## 🚀 Quick Start

### Backend Setup

\`\`\`bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser (admin account)
python manage.py createsuperuser

# Set admin role (in Django shell)
python manage.py shell
>>> from users.models import User
>>> user = User.objects.get(username='your_username')
>>> user.role = 'ADMIN'
>>> user.is_verified = True
>>> user.save()
>>> exit()

# Start development server
python manage.py runserver
\`\`\`

### Frontend Setup

\`\`\`bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Frontend will be available at http://localhost:5173
\`\`\`

## 📖 Usage

### Regular Users

1. **Register** at `/register`
2. **Wait for admin approval**
3. **Login** at `/login`
4. **Create RMA** with "+ New RMA" button
   - Add device details
   - Attach files if needed
   - Submit multiple devices with "+ Add Another Device"
5. **Track progress** on dashboard

### Administrators

1. **Approve users** at `/admin/users`
2. **Review new RMAs** at `/admin/rmas`
3. **Update RMA states** through detail pages
4. **Configure stale timeouts** in Django Admin
5. **Monitor dashboard** at `/admin`

## 🔄 RMA State Flow

\`\`\`
SUBMITTED → APPROVED → RECEIVED → DIAGNOSED → REPAIRED/REPLACED → SHIPPED → COMPLETED
    ↓
REJECTED (terminal)
\`\`\`

## 📧 Email Notifications

Automatic emails sent for:
- New RMA submissions (to admins)
- RMA state changes (to user)
- User registrations (to admins)
- User approvals (to user)
- Stale RMA alerts (to admins)

**Development:** Emails print to console  
**Production:** Configure SMTP in settings.py

## ⚙️ Stale RMA Detection

\`\`\`bash
# Run manually
python manage.py check_stale_rmas

# Dry run
python manage.py check_stale_rmas --dry-run

# Schedule with cron (daily at 9 AM)
0 9 * * * cd /path/to/backend && python manage.py check_stale_rmas
\`\`\`

Configure timeouts in Django Admin → State Timeout Configurations

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register/` - Register user
- `POST /api/auth/login/` - Login (get JWT)
- `GET /api/auth/me/` - Current user
- `GET /api/auth/pending/` - Pending users (admin)
- `POST /api/auth/{id}/approve/` - Approve user (admin)

### RMA
- `GET /api/rma/` - List RMAs
- `POST /api/rma/` - Create RMA
- `POST /api/rma/group/` - Create RMA group
- `GET /api/rma/{id}/` - RMA details
- `PATCH /api/rma/{id}/` - Update RMA
- `POST /api/rma/{id}/state/` - Update state (admin)
- `GET /api/rma/{id}/audit/` - Audit history
- `POST /api/rma/{id}/attachments/` - Upload file

### Admin
- `GET /api/rma/search/` - Search RMAs
- `GET /api/rma/admin/dashboard/` - Metrics

## 🔒 Production Configuration

### Security Settings

\`\`\`python
# settings.py
DEBUG = False
SECRET_KEY = 'your-secret-key-here'  # Change this!
ALLOWED_HOSTS = ['yourdomain.com']
\`\`\`

### Email Configuration

\`\`\`python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@gmail.com'
EMAIL_HOST_PASSWORD = 'your-app-password'
DEFAULT_FROM_EMAIL = 'noreply@yourdomain.com'
\`\`\`

### Database (PostgreSQL)

\`\`\`python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'rmainator',
        'USER': 'your_user',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
\`\`\`

## 🐛 Troubleshooting

**"Account pending admin approval"**
- Contact admin or approve via Django admin

**Backend won't start**
- Run `python manage.py migrate`
- Activate virtual environment

**Frontend can't connect**
- Ensure backend runs on port 8000
- Check CORS settings

**No emails sending**
- Emails print to console in development
- Check terminal output

## 📁 Project Structure

\`\`\`
RMAinator/
├── backend/
│   ├── users/          # Authentication
│   ├── rma/            # RMA management
│   ├── notifications/  # Emails & stale detection
│   ├── audit/          # Audit logging
│   └── rmainator/      # Settings
├── frontend/
│   └── src/
│       ├── pages/      # React pages
│       ├── services/   # API client
│       └── contexts/   # Auth context
└── README.md
\`\`\`

## ✅ Implementation Status

- ✅ Phase 1: Foundation (Auth, Models)
- ✅ Phase 2: RMA Management (CRUD, UI)
- ✅ Phase 3: Admin Features (Dashboard, Search)
- ✅ Phase 4: Notifications & Alerts
- ✅ Phase 5: Audit Logging
- 🔄 Phase 6: Testing & Polish (In Progress)

---

Built for efficient RMA tracking 🚀
