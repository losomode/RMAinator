# RMAinator - RMA Device Tracking System

A comprehensive web application for tracking Return Merchandise Authorization (RMA) devices through their repair lifecycle.

## Technology Stack

- **Backend**: Django 6.0 + Django REST Framework
- **Frontend**: React 18 + Vite
- **Database**: SQLite (dev), PostgreSQL-ready
- **Authentication**: JWT tokens
- **Deployment**: Docker + Docker Compose

## Project Status

✅ **Phase 1: Foundation** - Complete
- User authentication with JWT
- Custom User model with role-based access
- Complete RMA data models
- Admin approval workflow

✅ **Phase 2.1: RMA API Endpoints** - Complete
- Full CRUD operations for RMAs
- State transition management
- File attachment support
- Batch RMA creation
- Advanced search and filtering

🚧 **In Progress**: Frontend React components, Admin dashboard, Notifications

## Quick Start

### Backend Setup

1. **Create and activate virtual environment**:
```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

2. **Install dependencies**:
```bash
cd backend
pip install -r requirements.txt
```

3. **Run migrations**:
```bash
python manage.py migrate
```

4. **Create superuser** (admin account):
```bash
python manage.py createsuperuser
```

5. **Run development server**:
```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000/`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000/`

### Docker Setup

```bash
docker-compose up --build
```

This starts both backend (port 8000) and frontend (port 3000).

## API Documentation

Base URL: `http://localhost:8000/api/`

### Authentication Endpoints

#### Register
```http
POST /api/auth/register/
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "password2": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

Response:
```json
{
  "message": "User created successfully. Please wait for admin approval.",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "role": "USER",
    "is_verified": false
  }
}
```

#### Login
```http
POST /api/auth/login/
Content-Type: application/json

{
  "username": "johndoe",
  "password": "SecurePass123!"
}
```

Response:
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "role": "USER",
    "is_verified": true
  }
}
```

#### Get Current User
```http
GET /api/auth/me/
Authorization: Bearer {access_token}
```

#### List Pending Users (Admin Only)
```http
GET /api/auth/pending/
Authorization: Bearer {admin_access_token}
```

#### Approve/Reject User (Admin Only)
```http
POST /api/auth/{user_id}/approve/
Authorization: Bearer {admin_access_token}
Content-Type: application/json

{
  "approve": true
}
```

### RMA Endpoints

All RMA endpoints require authentication with JWT token:
```http
Authorization: Bearer {access_token}
```

#### List RMAs
```http
GET /api/rma/
GET /api/rma/?archived=false  # Filter active RMAs
GET /api/rma/?archived=true   # Filter archived RMAs
```

Users see only their own RMAs. Admins see all RMAs.

#### Create RMA
```http
POST /api/rma/
Content-Type: application/json

{
  "serial_number": "SN12345",
  "first_ship_date": "2023-01-15",
  "fault_notes": "Device not powering on. LED not lighting.",
  "priority": "NORMAL"
}
```

#### Get RMA Details
```http
GET /api/rma/{id}/
```

Returns full RMA details including attachments and state history.

#### Update RMA (Admin can update all fields, users limited)
```http
PATCH /api/rma/{id}/
Content-Type: application/json

{
  "root_cause": "Power supply failure",
  "parts_replaced": "Power supply module",
  "cost_to_repair": "$45"
}
```

#### Update RMA State (Admin Only)
```http
POST /api/rma/{id}/state/
Content-Type: application/json

{
  "state": "APPROVED",
  "notes": "RMA approved - awaiting device shipment"
}
```

Valid state transitions:
- SUBMITTED → APPROVED or REJECTED
- APPROVED → RECEIVED
- RECEIVED → DIAGNOSED
- DIAGNOSED → REPAIRED or REPLACED
- REPAIRED/REPLACED → SHIPPED
- SHIPPED → COMPLETED

#### Upload Attachment
```http
POST /api/rma/{id}/attachments/
Content-Type: multipart/form-data

file: [binary file data]
```

#### Delete Attachment
```http
DELETE /api/rma/attachments/{attachment_id}/
```

#### Create Batch RMAs
```http
POST /api/rma/batch/
Content-Type: application/json

{
  "rmas": [
    {
      "serial_number": "SN001",
      "first_ship_date": "2023-01-15",
      "fault_notes": "Issue 1",
      "priority": "HIGH"
    },
    {
      "serial_number": "SN002",
      "first_ship_date": "2023-02-20",
      "fault_notes": "Issue 2",
      "priority": "NORMAL"
    }
  ]
}
```

#### Search RMAs (Admin Only)
```http
GET /api/rma/search/?q=SN12345
GET /api/rma/search/?state=SUBMITTED
GET /api/rma/search/?priority=HIGH
GET /api/rma/search/?batch=1
GET /api/rma/search/?date_from=2024-01-01
GET /api/rma/search/?date_to=2024-12-31
```

Multiple filters can be combined.

## Data Models

### User
- username, email, password
- role: USER or ADMIN
- is_verified: requires admin approval

### RMA
- rma_number (auto-generated)
- serial_number
- owner (User)
- state (SUBMITTED → APPROVED/REJECTED → RECEIVED → DIAGNOSED → REPAIRED/REPLACED → SHIPPED → COMPLETED)
- priority (LOW, NORMAL, HIGH)
- first_ship_date, rma_received_date, return_date
- fault_notes (user-submitted)
- Technical fields (admin-only): root_cause, parts_replaced, cost_to_repair, tx2_mac, etc.
- Calculated: years_in_field, is_archived

### RMA State Flow

```
SUBMITTED
    ↓
APPROVED ← → REJECTED (terminal)
    ↓
RECEIVED
    ↓
DIAGNOSED
    ↓
REPAIRED or REPLACED
    ↓
SHIPPED
    ↓
COMPLETED (terminal)
```

## Admin Interface

Access Django admin at: `http://localhost:8000/admin/`

Features:
- User management and approval
- RMA CRUD with inline state history
- Batch management
- Attachment management

## Testing

The backend can be tested using:
- Django admin interface
- API endpoints with tools like Postman, curl, or HTTPie
- Python shell: `python manage.py shell`

Example test in shell:
```python
from users.models import User
from rma.models import RMA

# Create a test user
user = User.objects.create_user(
    username='testuser',
    email='test@example.com',
    password='testpass123',
    is_verified=True
)

# Create an RMA
rma = RMA.objects.create(
    owner=user,
    serial_number='TEST123',
    fault_notes='Test device issue',
    priority=RMA.Priority.NORMAL
)

print(f"Created RMA #{rma.rma_number}")
```

## Development Notes

### Key Features Implemented

✅ User registration with admin approval
✅ JWT authentication with refresh tokens
✅ Role-based permissions (User/Admin)
✅ Complete RMA CRUD operations
✅ Automatic RMA number generation
✅ State transition validation
✅ File attachment support
✅ Batch RMA creation
✅ State history tracking (automatic)
✅ Advanced search and filtering
✅ Permission-based field visibility

### Security Features

- JWT token authentication
- Password validation
- Role-based access control
- User isolation (users only see their own RMAs)
- File upload validation (size limits)
- State transition validation

### Next Steps

1. ⏭️ React frontend components (Phase 2.2)
2. ⏭️ Admin dashboard with metrics (Phase 3)
3. ⏭️ Email notifications (Phase 4)
4. ⏭️ Stale RMA detection (Phase 4)
5. ⏭️ Audit logging (Phase 5)
6. ⏭️ Comprehensive testing (Phase 6)

## Project Structure

```
RMAinator/
├── backend/
│   ├── users/              # User authentication & management
│   │   ├── models.py       # Custom User model
│   │   ├── serializers.py  # User serializers
│   │   ├── views.py        # Auth endpoints
│   │   ├── permissions.py  # Custom permissions
│   │   └── urls.py
│   ├── rma/                # RMA core functionality
│   │   ├── models.py       # RMA, Batch, Attachment, StateHistory
│   │   ├── serializers.py  # RMA serializers
│   │   ├── views.py        # RMA endpoints
│   │   ├── signals.py      # State change tracking
│   │   ├── admin.py        # Admin interface
│   │   └── urls.py
│   ├── notifications/      # Email notifications (ready)
│   ├── audit/              # Audit logging (ready)
│   └── rmainator/          # Project settings
├── frontend/               # React application (in progress)
├── docker-compose.yml
└── README.md
```

## Contributing

This project follows the specification in `SPECIFICATION.md`. See the document for detailed implementation phases and requirements.

## License

[Your License Here]
