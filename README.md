# RMAinator

> *"Behold, the RMA-inator! It tracks every return, repair, and replacement with the efficiency of... well, a really efficient tracking system!"*

**RMAinator** is a complete RMA (Return Merchandise Authorization) tracking system that manages device repair workflows from submission to completion. Part of the [Inator Platform](https://github.com/losomode/inator), it gives admins full control over repair operations while keeping customers informed every step of the way.

[![Django](https://img.shields.io/badge/django-6.0-green)](https://www.djangoproject.com/) [![React](https://img.shields.io/badge/react-18-blue)](https://reactjs.org/) [![Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen)](./backend) [![Tests](https://img.shields.io/badge/tests-65%20passing-success)](./backend)

---

## 🎯 What Does It Do?

RMAinator handles the complete lifecycle of device returns:

```mermaid
stateDiagram-v2
    [*] --> SUBMITTED: Customer submits RMA
    SUBMITTED --> APPROVED: Admin reviews & approves
    SUBMITTED --> REJECTED: Out of warranty/invalid
    APPROVED --> RECEIVED: Device arrives at facility
    RECEIVED --> DIAGNOSED: Technician identifies issue
    DIAGNOSED --> REPAIRED: Device fixed
    DIAGNOSED --> REPLACED: Unit swapped out
    REPAIRED --> SHIPPED: Return to customer
    REPLACED --> SHIPPED: Send replacement
    SHIPPED --> COMPLETED: Customer confirms receipt
    REJECTED --> [*]
    COMPLETED --> [*]
    
    note right of SUBMITTED
        📝 With photos, serial numbers,
        fault notes, and attachments
    end note
    
    note right of DIAGNOSED
        🔧 Root cause analysis,
        parts tracking, cost calculation
    end note
```

**For Customers:**
- Submit RMAs with photos and documentation
- Track repair status in real-time
- Receive email notifications at each stage
- View complete repair history

**For Admins:**
- Approve/reject RMA requests
- Track device through repair workflow
- Record technical details (root cause, parts, costs)
- Monitor stale RMAs with configurable timeouts
- Full audit trail of all changes

---

## 🏗️ Architecture

RMAinator is a standalone microservice that delegates authentication to **Authinator**:

```mermaid
graph TB
    subgraph "Client Browser"
        UI[🖥 React Frontend<br/>localhost:5173]
    end
    
    subgraph "RMAinator Service"
        API[⚙️ Django Backend<br/>localhost:8000]
        DB[(💾 Database<br/>SQLite/Postgres)]
        FILES[📎 File Storage<br/>RMA Attachments]
    end
    
    subgraph "External Services"
        AUTH[🔐 Authinator<br/>JWT Auth & Users]
        SMTP[📧 SMTP Server<br/>Email Notifications]
    end
    
    UI -->|HTTP + JWT| API
    UI -.->|Login/Register| AUTH
    API -->|Validate Token| AUTH
    API --> DB
    API --> FILES
    API -->|Send Emails| SMTP
    
    style UI fill:#61dafb,stroke:#333,stroke-width:2px
    style API fill:#092e20,stroke:#333,stroke-width:2px,color:#fff
    style AUTH fill:#4a90d9,stroke:#333,stroke-width:2px,color:#fff
    style DB fill:#336791,stroke:#333,stroke-width:2px,color:#fff
    style SMTP fill:#ea4335,stroke:#333,stroke-width:2px,color:#fff
```

**Key Design Decisions:**
- **JWT Authentication**: No local user database, all auth via Authinator
- **Django + DRF**: Robust backend with batteries included
- **React + Vite**: Modern, fast frontend development
- **Email Notifications**: Automatic updates at each workflow stage
- **File Attachments**: S3-compatible storage for photos and documents
- **Audit Logging**: Complete field-level change tracking

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- [Task](https://taskfile.dev/) - `brew install go-task`
- Access to Authinator (for JWT validation)

### Installation

```bash
# Clone the repo
git clone git@github.com:losomode/RMAinator.git
cd RMAinator

# Install everything (backend + frontend)
task install

# Configure Authinator connection
cp .env.example .env
# Edit .env with your AUTHINATOR_API_URL and AUTHINATOR_API_KEY
```

### Development

```bash
# Terminal 1: Start backend
task backend:dev

# Terminal 2: Start frontend  
task frontend:dev
```

**Access:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Django Admin: http://localhost:8000/admin

### Production Deployment

```bash
# Build production assets
task build

# Run database migrations
task backend:migrate

# Collect static files
task backend:collectstatic

# Run with gunicorn (example)
gunicorn config.wsgi:application --bind 0.0.0.0:8000
```

See [Deployment](#-deployment) section for full production setup.

---

## 📋 Available Tasks

```bash
task --list                   # Show all available commands

# Development
task dev                      # Show dev server instructions
task backend:dev              # Run Django dev server
task frontend:dev             # Run Vite dev server

# Testing & Quality
task test                     # Run all tests
task test:coverage            # Run tests with coverage (must be ≥85%)
task check                    # Pre-commit checks (lint, fmt, test)

# Database
task backend:migrate          # Run migrations
task backend:makemigrations   # Create migrations
task backend:shell            # Django shell
task db:reset                 # Reset database (⚠️ destructive)

# Utilities
task backend:check-stale      # Check for stale RMAs
task build                    # Build for production
task clean                    # Clean build artifacts
```

---

## 🔄 The RMA Workflow

### Customer Journey

```mermaid
sequenceDiagram
    participant C as Customer
    participant UI as RMAinator UI
    participant AUTH as Authinator
    participant API as RMAinator API
    participant EMAIL as Email
    
    C->>AUTH: Login/Register
    AUTH->>C: JWT Token
    
    C->>UI: Create RMA + Upload Photos
    UI->>API: POST /api/rma/ (JWT)
    API->>AUTH: Validate Token
    AUTH->>API: User Info
    API->>EMAIL: Notify Admins
    API->>C: RMA Created (#12345)
    
    Note over C,API: Admin reviews and approves...
    
    API->>EMAIL: Notify Customer: APPROVED
    EMAIL->>C: "RMA #12345 Approved"
    
    Note over API: Device arrives, repaired, shipped...
    
    API->>EMAIL: Notify at each state change
    EMAIL->>C: "RMA #12345 is SHIPPED"
    
    C->>UI: Confirm receipt
    UI->>API: PATCH /api/rma/12345/state/
    API->>C: RMA COMPLETED
```

### Admin Workflow

```mermaid
graph LR
    A[📥 New RMA<br/>Submitted] --> B{Review}
    B -->|Approve| C[✅ Approved]
    B -->|Reject| D[❌ Rejected]
    
    C --> E[📦 Device<br/>Received]
    E --> F[🔍 Diagnosed]
    F --> G{Repair or<br/>Replace?}
    G -->|Repair| H[🔧 Repaired]
    G -->|Replace| I[🔄 Replaced]
    H --> J[📫 Shipped]
    I --> J
    J --> K[✨ Completed]
    
    D --> END[End]
    K --> END
    
    style A fill:#3498db,color:#fff
    style C fill:#2ecc71,color:#fff
    style D fill:#e74c3c,color:#fff
    style K fill:#9b59b6,color:#fff
```

**Admin Actions at Each Stage:**
1. **SUBMITTED** → Review RMA details, approve or reject with reason
2. **APPROVED** → Mark as RECEIVED when device arrives
3. **RECEIVED** → Diagnose issue, add technical notes
4. **DIAGNOSED** → Record root cause, required parts, estimated cost
5. **REPAIRED/REPLACED** → Document work performed, actual costs
6. **SHIPPED** → Add tracking number, return date
7. **COMPLETED** → Archive RMA, calculate time-in-state metrics

---

## 🎯 Features

### 👤 Customer Features

- 🔐 **Secure Authentication** - Via Authinator (SSO, 2FA, WebAuthn supported)
- 📦 **Multi-Device Submissions** - Group multiple devices in one RMA
- 📎 **File Attachments** - Upload photos, PDFs, diagnostic reports
- 📊 **Real-Time Tracking** - See current status and complete history
- 🔔 **Email Notifications** - Automatic updates at each workflow stage
- 📜 **Audit History** - View every change made to your RMA
- 🔍 **Search & Filter** - Find RMAs by serial number, date, status

### 👨‍💼 Admin Features

- 🏛️ **Complete RMA Management** - Search, filter, bulk actions
- 🔄 **State Management** - Transition RMAs through defined workflow
- 📈 **Admin Dashboard** - Metrics, trends, recent activity at a glance
- ⚠️ **Stale RMA Detection** - Configurable timeout alerts by state/priority
- 🔍 **Advanced Search** - Filter by RMA#, serial, owner, state, priority, dates
- 📝 **Technical Fields** - Root cause, parts, costs, diagnostic details
- 📧 **Admin Notifications** - Alerts for new RMAs and stale items
- 🕐 **Complete Audit Trail** - Field-level change history
- 🔐 **Role-Based Access** - Permissions via Authinator JWT tokens
- 📊 **Reporting** - Export capabilities, analytics

---

## 🗂️ Project Structure

```
RMAinator/
├── backend/                          # Django application
│   ├── config/                       # Settings, URLs, WSGI
│   │   ├── settings.py               # Environment-based config
│   │   └── urls.py                   # API routing
│   ├── core/                         # Shared functionality
│   │   ├── authentication.py         # Authinator JWT validation
│   │   ├── authinator_client.py      # Authinator API client
│   │   ├── permissions.py            # Role-based permissions
│   │   ├── test_authentication.py    # Auth tests (100% coverage)
│   │   └── test_utils.py             # Test helpers
│   ├── rma/                          # RMA domain logic
│   │   ├── models.py                 # RMA, RMAGroup, state history
│   │   ├── views.py                  # REST API endpoints
│   │   ├── serializers.py            # DRF serializers
│   │   ├── dashboard.py              # Admin metrics
│   │   ├── signals.py                # Email triggers
│   │   ├── test_models.py            # Model tests (95%)
│   │   ├── test_views.py             # API tests (99%)
│   │   └── test_dashboard.py         # Dashboard tests (98%)
│   ├── notifications/                # Email & alerts
│   │   ├── models.py                 # StateTimeout, StaleRMARecord
│   │   ├── utils.py                  # Email utilities
│   │   ├── tests.py                  # Notification tests (78%)
│   │   └── management/commands/      # CLI commands
│   ├── audit/                        # Change tracking
│   │   └── models.py                 # Audit log
│   ├── users/                        # Minimal User model
│   │   └── models.py                 # For FK relations only
│   ├── requirements.txt              # Python dependencies
│   └── manage.py                     # Django CLI
├── frontend/                         # React application
│   ├── src/
│   │   ├── pages/                    # Route components
│   │   ├── components/               # Reusable UI components
│   │   ├── services/                 # API client
│   │   ├── contexts/                 # React contexts (auth, etc.)
│   │   └── types.ts                  # TypeScript definitions
│   ├── package.json                  # Node dependencies
│   └── vite.config.ts                # Vite configuration
├── docs/                             # Documentation
│   └── images/                       # Screenshots
├── Taskfile.yml                      # Task automation
├── .env.example                      # Environment template
├── CHANGELOG.md                      # Version history
├── SPECIFICATION.md                  # Requirements
└── README.md                         # This file
```

---

## 🧪 Testing

RMAinator has comprehensive test coverage meeting [Deft](https://github.com/losomode/inator/blob/main/deft/main.md) standards:

```bash
# Run all tests
task test

# Run with coverage report
task test:coverage

# Run specific test file
python backend/manage.py test rma.test_models
```

**Coverage Stats (85% overall, 87% unfiltered):**
- ✅ 65 tests passing
- ✅ RMA models, views, serializers: 95-99%
- ✅ Admin dashboard: 98%
- ✅ Notifications: 78%
- ✅ Authinator auth: 100%
- ✅ Audit logging: 90%

**Test Files:**
- `backend/rma/test_models.py` - RMA, RMAGroup, state history, attachments
- `backend/rma/test_views.py` - API endpoints, permissions, state transitions
- `backend/rma/test_dashboard.py` - Admin metrics and analytics
- `backend/notifications/tests.py` - Email utilities, stale RMA detection
- `backend/core/test_authentication.py` - JWT validation, user roles

---

## 🔧 Configuration

### Environment Variables

```bash
# Backend (.env)
DEBUG=False
SECRET_KEY=your-secret-key-here-change-this
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Authinator (required)
AUTHINATOR_API_URL=https://your-authinator.com/api
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

# File Storage (optional, local default)
AWS_STORAGE_BUCKET_NAME=your-bucket
AWS_S3_REGION_NAME=us-east-1
```

### Stale RMA Detection

Configure timeout thresholds by state and priority:

1. Access Django Admin: http://localhost:8000/admin
2. Go to **Notifications** → **State Timeouts**
3. Create timeout rules:
   - HIGH priority SUBMITTED = 24 hours
   - NORMAL priority DIAGNOSED = 72 hours
   - etc.

Run the checker:
```bash
# Manually
task backend:check-stale

# Via cron (production)
0 9 * * * cd /path/to/backend && python manage.py check_stale_rmas
```

---

## 🌐 Deployment

### Production Checklist

- [ ] Set `DEBUG=False` in environment
- [ ] Configure strong `SECRET_KEY`
- [ ] Set `ALLOWED_HOSTS` correctly
- [ ] Configure Authinator connection
- [ ] Set up SMTP email (not console backend)
- [ ] Use PostgreSQL (not SQLite)
- [ ] Configure S3/compatible storage for files
- [ ] Set up HTTPS/TLS
- [ ] Run migrations: `task backend:migrate`
- [ ] Collect static files: `task backend:collectstatic`
- [ ] Configure cron for stale RMA checks

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name rmainator.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name rmainator.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Frontend (SPA)
    location / {
        root /var/www/rmainator/frontend/dist;
        try_files $uri /index.html;
    }
    
    # API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files
    location /static/ {
        alias /var/www/rmainator/backend/staticfiles/;
    }
    
    # Media files (RMA attachments)
    location /media/ {
        alias /var/www/rmainator/backend/media/;
    }
}
```

### Systemd Service (Backend)

```ini
[Unit]
Description=RMAinator Backend
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/var/www/rmainator/backend
Environment="PATH=/var/www/rmainator/.venv/bin"
ExecStart=/var/www/rmainator/.venv/bin/gunicorn config.wsgi:application \
    --bind 127.0.0.1:8000 \
    --workers 4 \
    --access-logfile /var/log/rmainator/access.log \
    --error-logfile /var/log/rmainator/error.log
ExecReload=/bin/kill -s HUP $MAINPID
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

---

## 📊 API Reference

### Authentication

All API requests require a valid JWT token from Authinator in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

### RMA Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/rma/` | List user's RMAs | User |
| `POST` | `/api/rma/` | Create RMA | User |
| `POST` | `/api/rma/group/` | Create RMA group | User |
| `GET` | `/api/rma/{id}/` | RMA details | User |
| `PATCH` | `/api/rma/{id}/` | Update RMA | User/Admin |
| `POST` | `/api/rma/{id}/state/` | Update state | Admin |
| `GET` | `/api/rma/{id}/audit/` | Audit history | User/Admin |
| `POST` | `/api/rma/{id}/attachments/` | Upload file | User/Admin |
| `GET` | `/api/rma/search/` | Advanced search | Admin |
| `GET` | `/api/rma/admin/dashboard/` | Admin metrics | Admin |

### Example: Create RMA

```bash
curl -X POST http://localhost:8000/api/rma/ \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serial_number": "SN123456",
    "fault_notes": "Device won'\''t power on",
    "priority": "HIGH",
    "first_ship_date": "2024-01-15"
  }'
```

Response:
```json
{
  "id": 123,
  "rma_number": 12345,
  "serial_number": "SN123456",
  "state": "SUBMITTED",
  "priority": "HIGH",
  "created_at": "2024-02-27T12:00:00Z",
  "owner": {
    "username": "customer@example.com",
    "email": "customer@example.com"
  }
}
```

---

## 🐛 Troubleshooting

### Authentication Issues

**"Invalid token" or "Authentication failed"**
- Ensure Authinator is running and accessible
- Verify `AUTHINATOR_API_URL` and `AUTHINATOR_API_KEY` in `.env`
- Check token hasn't expired (try logging out and back in)
- Review Authinator logs for validation errors

**"Cannot connect to Authinator"**
- Verify network connectivity: `curl $AUTHINATOR_API_URL/health`
- Check firewall rules between RMAinator and Authinator
- Ensure Authinator service is running

### Backend Issues

**Backend won't start**
```bash
# Check for migration issues
task backend:migrate

# Activate venv and check dependencies
source .venv/bin/activate
pip install -r backend/requirements.txt

# Check for configuration errors
python backend/manage.py check
```

**Database errors**
```bash
# Reset database (⚠️ destroys all data)
task db:reset

# Or manually
rm backend/db.sqlite3
task backend:migrate
```

### Frontend Issues

**Frontend can't connect to backend**
- Verify backend is running on port 8000
- Check `VITE_API_URL` in `frontend/.env`
- Check CORS settings in `backend/config/settings.py`
- Verify `VITE_AUTHINATOR_URL` for login redirects

**Build errors**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Email Issues

**No emails in development**
- This is expected! Django prints emails to console
- Check backend terminal for email output

**Emails not sending in production**
- Verify SMTP credentials in `.env`
- Test SMTP connection: `telnet $EMAIL_HOST $EMAIL_PORT`
- Check SMTP server logs
- Verify `EMAIL_USE_TLS` matches server config

---

## 📦 Repository

**GitHub**: [losomode/RMAinator](https://github.com/losomode/RMAinator)

## 📝 License

MIT — See [LICENSE](LICENSE) for details.

## 👥 Contributing

Part of the Inator Platform. See main platform docs for contributing guidelines.

**Quick workflow**:
1. Create feature branch: `git checkout -b feat/your-feature`
2. Make changes
3. Run checks: `task check` (must pass, coverage ≥85%)
4. Commit: [Conventional Commits](https://www.conventionalcommits.org/) format
5. Push and create PR

## ❓ Support

- **Issues**: [GitHub Issues](https://github.com/losomode/RMAinator/issues)
- **Platform Docs**: [Inator Platform](https://github.com/losomode/inator)
- **Authinator**: [AUTHinator](https://github.com/losomode/AUTHinator)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)

## ✅ Version History

- ✅ **v1.0.0** (2024-02-21) - Initial release with local auth, SSO, 2FA, WebAuthn
- ✅ **v2.0.0** (2024-02-26) - **BREAKING:** Migrated to Authinator microservice architecture
  - Removed local authentication (now via Authinator)
  - Added 65 tests, 85% coverage
  - Updated documentation for microservices

---

*Built with ❤️ for the Inator Platform*

> *"And by efficient, I mean it actually works. Unlike that time with the RETURN-inator Mark I. We don't talk about Mark I."*
