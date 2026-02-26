# RMAinator

**A complete RMA device tracking system for managing repair workflows from submission to completion.**

[![Django](https://img.shields.io/badge/django-6.0-blue)]() [![React](https://img.shields.io/badge/react-18-blue)]()

---

## 📖 Table of Contents

- [For End Users](#-for-end-users) - How to submit and track RMAs
- [For Administrators](#-for-administrators) - How to manage RMAs and users
- [For Developers](#-for-developers) - Setup and deployment
- [Features](#-features) - Complete feature list
- [API Documentation](#-api-documentation)

---

## 👥 For End Users

### Getting Started

1. **Register**: Visit the registration page and create an account
2. **Wait for Approval**: An administrator will approve your account (you'll receive an email)
3. **Login**: Use your credentials to access the system (authentication is handled by Authinator)

### Submitting an RMA

1. Click **"+ New RMA"** from your dashboard
2. Fill in device information:
   - Serial number
   - First ship date (optional)
   - Issue description
   - Priority level (Low/Normal/High)
3. **Attach files** (optional): photos, PDFs, or documents showing the issue
4. For multiple devices with the same issue: Click **"+ Add Another Device"**
5. Click **Submit**

### Tracking Your RMAs

**Dashboard Views:**
- **All RMAs**: See all your submissions in a grid view
- **By RMA Group**: Multi-device submissions organized by group with expand/collapse controls

![User Dashboard - By Group View](docs/images/User2.png)
*Dashboard showing RMA groups with collapse controls*

**RMA Cards** show:
- Serial number
- Current state
- Priority
- Created date
- Completion/closure date (if applicable)

![User Dashboard - All RMAs View](docs/images/User3.png)
*Dashboard showing all RMAs in grid view*

**Click any RMA** to see:
- Complete device information
- Full status history timeline
- State transition dates
- Admin notes and updates
- Attached files

![RMA Detail View](docs/images/User1.png)
*Detailed RMA view with device info and status history*

### Email Notifications

You'll receive automatic emails when:
- Your account is approved
- Your RMA is approved or rejected
- Your RMA state changes (received, diagnosed, repaired, shipped, completed)

### RMA Lifecycle

```mermaid
stateDiagram-v2
    [*] --> SUBMITTED: User creates RMA
    SUBMITTED --> APPROVED: Admin approves
    SUBMITTED --> REJECTED: Admin rejects
    APPROVED --> RECEIVED: Device arrives
    RECEIVED --> DIAGNOSED: Issue identified
    DIAGNOSED --> REPAIRED: Device fixed
    DIAGNOSED --> REPLACED: Unit swapped
    REPAIRED --> SHIPPED: Sent to customer
    REPLACED --> SHIPPED: Sent to customer
    SHIPPED --> COMPLETED: RMA closed
    REJECTED --> [*]
    COMPLETED --> [*]
    
    note right of SUBMITTED
        📝 User submits device
        with issue description
    end note
    
    note right of REJECTED
        ❌ Terminal state
        (Out of warranty, etc.)
    end note
    
    note right of COMPLETED
        ✨ Terminal state
        (Device returned)
    end note
```

---

## 👨‍💼 For Administrators

### User Management

**Approve New Users:**
1. Go to **Admin** → **User Approvals**
2. Review pending registrations
3. Click **Approve** or **Reject** with a reason

### RMA Management Workflow

```mermaid
sequenceDiagram
    participant User
    participant System
    participant Admin
    participant Email
    
    User->>System: Register account
    System->>Email: Notify admin of new user
    Admin->>System: Approve user
    System->>Email: Send approval notification
    Email->>User: Account approved
    
    User->>System: Submit RMA (with files)
    System->>Email: Notify admins of new RMA
    Admin->>System: Review & approve RMA
    System->>Email: Notify user of approval
    Email->>User: RMA approved
    
    Note over Admin,System: Device received at facility
    Admin->>System: Update state: RECEIVED
    System->>Email: Notify user
    
    Note over Admin,System: Technician diagnoses issue
    Admin->>System: Update state: DIAGNOSED<br/>Add root cause
    System->>Email: Notify user
    
    Note over Admin,System: Device repaired
    Admin->>System: Update state: REPAIRED<br/>Add parts/cost
    System->>Email: Notify user
    
    Note over Admin,System: Device shipped back
    Admin->>System: Update state: SHIPPED
    System->>Email: Notify user
    
    Note over Admin,System: RMA process complete
    Admin->>System: Update state: COMPLETED
    System->>Email: Notify user
    Email->>User: Device returned
```

**Key Admin Actions:**

1. **Review New RMAs**: View SUBMITTED RMAs, approve or reject
2. **Update Status**: Transition through states as device progresses
3. **Add Technical Info**: Root cause, parts, cost, diagnostics
4. **Monitor**: Track stale RMAs and metrics

### Admin Dashboard

Access the Django admin interface at `/admin/` to manage all aspects of the system.

![Django Admin - RMA List](docs/images/Admin1.png)
*Admin view showing all RMAs with advanced filtering and search*

**Django Admin Features:**
- Complete RMA list with inline filtering
- Filter by state, priority, owner, date range
- Search by RMA number, serial number
- Bulk actions for state updates
- Full audit trail access

![Django Admin - RMA Detail](docs/images/Admin2.png)
*Admin RMA detail view with all technical fields*

![Django Admin - State History](docs/images/Admin3.png)
*Complete state transition history for tracking workflow*

![Django Admin - User Management](docs/images/Admin4.png)
*User management with role and verification status*

### Stale RMA Management

**Configure Timeouts:**
1. Access Django Admin at `/admin/`
2. Go to **Notifications** → **State Timeouts**
3. Set timeout hours per state and priority
   - Example: HIGH priority SUBMITTED = 24 hours
   - Example: NORMAL priority DIAGNOSED = 72 hours

**Check for Stale RMAs:**
```bash
# Run manually
task backend:check-stale

# Or directly:
python manage.py check_stale_rmas
```

**Setup Automated Checks** (see deployment section)

---

## 🛠️ For Developers

### Prerequisites

- Python 3.10+
- Node.js 18+
- [Task](https://taskfile.dev/) (optional but recommended)
- Access to Authinator authentication service

### Quick Start with Taskfile

```bash
# Install all dependencies
task install

# Start backend (terminal 1)
task backend:dev

# Start frontend (terminal 2)
task frontend:dev
```

**Access:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Django Admin: http://localhost:8000/admin

**Authentication Setup:**

Authentication is handled by the external **Authinator** service. Configure the following environment variables:

```bash
AUTHINATOR_API_URL=https://your-authinator-instance.com/api
AUTHINATOR_API_KEY=your-authinator-api-key
```

### Manual Setup

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Create Admin User

```bash
# Admin users are managed in Authinator
# Create an admin user in Authinator with role='ADMIN'
# No local user management required
```

### Import Sample Data

```bash
# Import from Excel
cd backend
python manage.py import_excel path/to/file.xlsx --admin-username admin
```

### Testing

```bash
# Run all tests with coverage
task test:coverage

# Backend tests only
task backend:test

# Check code quality
task check  # Runs fmt, lint, test, coverage
```

**Current Coverage:** Test coverage metrics available via `task test:coverage`

### Available Tasks

```bash
task --list  # Show all available commands

# Key commands:
task install              # Install all dependencies
task dev                  # Show dev server instructions
task test                 # Run all tests
task test:coverage        # Run with coverage report
task check                # Pre-commit checks
task build                # Build for production
task clean                # Clean artifacts
task backend:migrate      # Run migrations
task backend:shell        # Django shell
task db:reset             # Reset database
```

### System Architecture

```mermaid
graph TB
    subgraph Client["👤 Client Browser"]
        UI[React Frontend<br/>Port 5173]
    end
    
    subgraph Backend["🖥️ Backend Server"]
        API[Django REST API<br/>Port 8000]
        Auth[Authinator JWT Auth]
        subgraph Apps["Django Apps"]
            RMA[rma<br/>Device Tracking]
            Notif[notifications<br/>Email & Alerts]
            Audit[audit<br/>Change History]
        end
    end
    
    subgraph AuthService["🔐 Authinator"]
        AuthAPI[Authentication API]
    end
    
    subgraph Storage["💾 Storage"]
        DB[(SQLite/PostgreSQL<br/>Database)]
        Files[File Storage<br/>Attachments]
    end
    
    subgraph External["📧 External Services"]
        SMTP[SMTP Server<br/>Email Delivery]
    end
    
    UI -->|HTTP + JWT| API
    UI -->|Login/Register| AuthAPI
    API --> Auth
    Auth -->|Validate Token| AuthAPI
    API --> RMA
    API --> Notif
    API --> Audit
    
    RMA --> DB
    Notif --> DB
    Audit --> DB
    
    RMA --> Files
    Notif -->|Send Emails| SMTP
    
    style UI fill:#61dafb,stroke:#333,stroke-width:2px
    style API fill:#092e20,stroke:#333,stroke-width:2px,color:#fff
    style DB fill:#336791,stroke:#333,stroke-width:2px,color:#fff
    style SMTP fill:#ea4335,stroke:#333,stroke-width:2px,color:#fff
```

### Project Structure

```
RMAinator/
├── backend/
│   ├── core/
│   │   ├── authentication.py      # Authinator JWT authentication
│   │   └── authinator_client.py   # Authinator API client
│   ├── rma/                       # RMA models, views, serializers
│   ├── notifications/             # Email & stale RMA detection
│   ├── audit/                     # Audit logging
│   ├── rmainator/                 # Django settings
│   └── manage.py
├── frontend/
│   └── src/
│       ├── pages/          # React page components
│       │   └── Login.jsx   # Login form (redirects to Authinator)
│       ├── services/       # API client
│       └── contexts/       # Auth context
├── Taskfile.yml            # Task automation
├── README.md
└── SPECIFICATION.md        # Complete requirements
```

### Production Deployment

**Environment Variables:**

```bash
# Backend (.env)
DEBUG=False
SECRET_KEY=your-secret-key-here-change-this
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Authinator (required for authentication)
AUTHINATOR_API_URL=https://your-authinator-instance.com/api
AUTHINATOR_API_KEY=your-authinator-api-key

# Email (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# Database (optional, SQLite default)
DATABASE_URL=postgresql://user:pass@localhost/rmainator
```

**Docker Deployment:**

```bash
# Build and run
docker-compose up -d

# Run migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser
```

**Scheduled Tasks (cron):**

```bash
# Add to crontab for daily stale RMA checks at 9 AM
0 9 * * * cd /path/to/backend && python manage.py check_stale_rmas
```

**Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /path/to/frontend/dist;
        try_files $uri /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static files
    location /static/ {
        alias /path/to/backend/staticfiles/;
    }

    # Media files
    location /media/ {
        alias /path/to/backend/media/;
    }
}
```

---

## 🎯 Features

### User Features
- 🔐 **User Authentication** - Secure authentication via Authinator service
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

## 🏗️ Technology Stack

- **Backend:** Django 6.0, Django REST Framework
- **Frontend:** React 18, Vite, React Router
- **Database:** SQLite (dev), PostgreSQL-ready (prod)
- **Authentication:** Authinator JWT (external service)
- **Email:** Django email (console dev, SMTP prod)
- **Testing:** Django TestCase

## 📊 API Documentation

### Authentication
Authentication is handled by the external **Authinator** service. All user registration, login, profile management, and advanced authentication features (SSO, 2FA, WebAuthn) are managed through Authinator.

RMAinator validates JWT tokens issued by Authinator for API access.

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

## 🐛 Troubleshooting

**"Account pending admin approval"**
- An admin needs to approve your account
- Contact your administrator

**"Invalid credentials"**
- Ensure your account is approved and verified
- Check username/password
- Try password reset (if configured)

**Backend won't start**
```bash
# Check migrations
task backend:migrate

# Activate virtual environment
source backend/venv/bin/activate

# Check dependencies
pip install -r backend/requirements.txt
```

**Frontend can't connect to backend**
- Ensure backend is running on port 8000
- Check CORS settings in `backend/rmainator/settings.py`
- Verify `VITE_API_URL` in frontend `.env`

**No emails sending (development)**
- This is expected! Emails print to console
- Check backend terminal output

**Database errors**
```bash
# Reset database (⚠️ deletes all data)
task db:reset

# Or manually
cd backend
rm db.sqlite3
python manage.py migrate
```

## 🤝 Contributing

This is an internal project. For changes:
1. Create a feature branch
2. Make changes
3. Run `task check` (tests + coverage)
4. Submit PR for review

## 📜 License

Proprietary - Internal Use Only

## ✅ Project Status

- ✅ Phase 1: Foundation (Auth, Models)
- ✅ Phase 2: RMA Management (CRUD, UI)
- ✅ Phase 3: Admin Features (Dashboard, Search)
- ✅ Phase 4: Notifications & Alerts
- ✅ Phase 5: Audit Logging
- ✅ Phase 6: Testing (75% coverage)
- 🔄 Polish & UX improvements (ongoing)

---

Built for efficient RMA tracking 🚀
