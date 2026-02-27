# RMAinator - RMA Device Tracking System

**Note**: References to Docker and container deployment in this document are outdated. The inator family no longer uses Docker. See `INATOR.md` for current architecture.

## Overview

RMAinator is a multi-user web application for tracking Return Merchandise Authorization (RMA) devices through their repair lifecycle. The system provides separate interfaces for end users (device owners) and administrators (repair technicians/managers), enabling efficient RMA request management, status tracking, and automated alerting for stale RMAs.

**Technology Stack:**
- Backend: Python + Django + Django REST Framework
- Frontend: React
- Database: SQLite
- API: REST with JWT authentication
- Deployment: Docker containers

## Requirements

### Functional Requirements

#### Authentication & Authorization
- ! MUST integrate with Authinator for user authentication via JWT tokens
- ! MUST support user roles from Authinator: SYSTEM_ADMIN, CUSTOMER_ADMIN, CUSTOMER_USER, CUSTOMER_READONLY
- ! MUST use JWT tokens for API authentication
- ! MUST NOT allow users to access other users' RMA data

#### User Features
- ! MUST allow authenticated users (via Authinator) to submit RMA requests (single or batch)
- ! MUST allow users to attach files (photos, PDFs, documents) to RMA submissions
- ! MUST allow users to view all their active RMAs with current status
- ! MUST allow users to view their archived (completed/rejected) RMAs
- ! MUST allow users to view complete history and progress for each RMA
- ! MUST send email notifications to users on RMA state changes
- ! MUST prevent users from seeing other users' RMAs or devices

#### Admin Features
- ! MUST allow admins to view new RMA requests
- ! MUST allow admins to approve or reject RMA requests with reason
- ! MUST allow admins to update RMA state through defined workflow
- ! MUST allow admins to update all RMA fields including technical diagnostics
- ! MUST allow admins to search RMAs by: serial number, RMA number, owner, batch, state, priority, date range
- ! MUST allow admins to configure per-state timeout thresholds for stale RMA alerts
- ! MUST send email alerts to admins for stale RMAs
- ! MUST provide dashboard with metrics: RMA counts by state, average time per state, stale RMA count, recent activity
- ~ SHOULD support filtering RMAs by multiple criteria simultaneously

#### RMA State Flow
- ! MUST enforce the following state transitions:
  - Submitted (initial state when user creates RMA)
  - Approved (admin approves the RMA request)
  - Rejected (admin rejects the RMA request - terminal state, archived)
  - Received (device physically received by repair facility)
  - Diagnosed (device diagnosis completed)
  - Repaired (device repaired with parts replaced)
  - Replaced (device replaced with different unit)
  - Shipped (device shipped back to customer)
  - Completed (RMA process complete - terminal state, archived)
- ! MUST track timestamp for each state transition
- ! MUST track which admin performed each state transition
- ⊗ MUST NOT allow invalid state transitions (e.g., Shipped → Submitted)

#### RMA Data Model
- ! MUST include all fields from reference document (Sighthound RMA Tracker.xlsx):
  - Serial Number (SN)
  - RMA Number (auto-generated sequential)
  - First Ship Date
  - RMA Received Date
  - Years in Field (calculated)
  - Return Date
  - Root Cause
  - Part(s) Replaced
  - Cost to Repair
  - RMA History (reference to previous RMAs for same device)
  - Fault/Notes
  - TX2 Mac Address
  - Script Ran (checkbox)
  - Services Enabled (checkbox)
  - Uptime Good (checkbox)
  - Stream Good (checkbox)
  - Ship Ready (checkbox)
- ! MUST add additional fields:
  - Priority (Low, Normal, High)
  - Batch ID (for grouping multiple RMAs submitted together)
  - Owner/User (reference to submitting user)
  - Current State
  - Created timestamp
  - Last modified timestamp
  - Rejection reason (if rejected)
- ! MUST allow multiple file attachments per RMA
- ! MUST make technical diagnostic fields (TX2 Mac, Script Ran, Services Enabled, etc.) admin-only

#### Stale RMA Detection
- ! MUST allow admins to configure timeout thresholds per state
- ! MUST allow different timeout thresholds based on priority level (High priority = shorter timeout)
- ! MUST check for stale RMAs on scheduled basis (e.g., daily)
- ! MUST send email notifications to admins when RMAs become stale
- ! MUST flag stale RMAs in admin dashboard

#### Audit Trail
- ! MUST log all RMA state changes with: timestamp, user who made change, old state, new state
- ! MUST log all field updates with: timestamp, user who made change, field name, old value, new value
- ! MUST display audit history to admins
- ~ SHOULD display relevant history to users (state changes only, not admin-only field changes)

### Non-Functional Requirements

#### Performance
- ~ SHOULD load dashboard with <1000 RMAs in under 2 seconds
- ~ SHOULD support pagination for large RMA lists
- ~ SHOULD index database columns used for searching (SN, RMA number, user, state)

#### Security
- ! MUST hash passwords using Django's default password hasher
- ! MUST validate JWT tokens on all API endpoints
- ! MUST enforce role-based access control on all endpoints
- ! MUST sanitize file uploads (type checking, size limits)
- ! MUST use HTTPS in production
- ~ SHOULD implement rate limiting on API endpoints

#### Scalability
- ~ SHOULD design for 1000+ RMAs and 100+ users
- ~ SHOULD support SQLite for development and small deployments
- ? MAY support PostgreSQL migration path for larger deployments

#### Reliability
- ! MUST handle email sending failures gracefully (log and retry)
- ! MUST validate all user inputs
- ~ SHOULD provide meaningful error messages to users

## Architecture

### System Architecture

```
┌─────────────────┐
│  React Frontend │
│   (Port 3000)   │
└────────┬────────┘
         │ HTTP/REST + JWT
         ↓
┌─────────────────┐
│ Django REST API │
│   (Port 8000)   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐     ┌──────────────┐
│  SQLite Database│     │ File Storage │
└─────────────────┘     └──────────────┘
```

### Component Architecture

#### Backend (Django)

**Apps:**
- `users` - User authentication, registration, approval
- `rma` - RMA model, state management, CRUD operations
- `notifications` - Email notifications, stale RMA detection
- `audit` - Audit trail logging

**Key Models:**
- `User` (extends Django AbstractUser) - user accounts, role, verification status
- `RMA` - RMA device records with all fields
- `RMAStateHistory` - state transition history
- `RMABatch` - batch grouping for bulk submissions
- `RMAAttachment` - file attachments
- `AuditLog` - comprehensive change log
- `StaleRMAConfig` - per-state timeout configuration
- `StateTimeout` - configurable timeouts per state per priority

**API Endpoints:**
- `/api/rma/` - list/create RMAs
- `/api/rma/{id}/` - retrieve/update/delete RMA
- `/api/rma/{id}/state/` - update RMA state (admin)
- `/api/rma/{id}/history/` - get state/audit history
- `/api/rma/{id}/attachments/` - manage attachments
- `/api/rma/batch/` - batch RMA creation
- `/api/rma/search/` - search/filter RMAs
- `/api/admin/dashboard/` - dashboard metrics (admin)
- `/api/admin/stale-config/` - stale RMA configuration (admin)

#### Frontend (React)

**Key Components:**
- `AuthProvider` - authentication context (integrates with Authinator)
- `UserDashboard` - user view of their RMAs
- `RMAList` - paginated RMA list with filters
- `RMADetail` - detailed RMA view with history
- `RMAForm` - RMA submission form
- `AdminDashboard` - admin metrics and overview
- `AdminRMAManagement` - admin RMA list/search/update
- `AdminStaleConfig` - stale RMA configuration
- `FileUpload` - file attachment component

**Routes:**
- `/dashboard` - user dashboard (active RMAs)
- `/rma/:id` - RMA detail view
- `/rma/new` - create new RMA
- `/rma/archived` - archived RMAs
- `/admin` - admin dashboard
- `/admin/rmas` - admin RMA management
- `/admin/config` - stale RMA configuration

### Data Flow Examples

#### User Submits RMA
1. User fills RMA form in React
2. POST /api/rma/ with RMA data + files
3. Django creates RMA with state=Submitted
4. Django creates audit log entry
5. Django sends email to admins (new RMA notification)
6. React redirects to RMA detail page

#### Admin Approves RMA
1. Admin clicks "Approve" in React
2. POST /api/rma/{id}/state/ with state=Approved
3. Django validates state transition
4. Django updates RMA state, creates state history entry
5. Django creates audit log entry
6. Django sends email to user (RMA approved)
7. React updates UI

#### Stale RMA Detection (Background Job)
1. Celery/cron job runs daily
2. Job queries all active RMAs
3. For each RMA, calculates time in current state
4. Compares to configured timeout for state+priority
5. If exceeded, marks as stale and sends email to admins

## Implementation Plan

### Phase 1: Foundation
**Goal:** Set up project structure, authentication, and basic RMA model

#### Subphase 1.1: Project Setup
**Dependencies:** None

- Task 1.1.1: Initialize Django project with DRF
  - Create Django project structure
  - Install dependencies: Django, DRF, djangorestframework-simplejwt
  - Configure settings for development
  - **Acceptance:** `python manage.py runserver` works

- Task 1.1.2: Initialize React frontend
  - Create React app with Vite
  - Install dependencies: React Router, Axios, JWT decode
  - Set up basic routing structure
  - **Acceptance:** `npm run dev` works, routing displays placeholder pages

- Task 1.1.3: Docker configuration
  - Create Dockerfile for Django
  - Create Dockerfile for React
  - Create docker-compose.yml for both services
  - **Acceptance:** `docker-compose up` runs both services

- Task 1.1.4: Create Django apps
  - Create `users`, `rma`, `notifications`, `audit` apps
  - Register apps in settings
  - **Acceptance:** Apps appear in Django admin

#### Subphase 1.2: User Authentication (depends on: 1.1)
**Dependencies:** 1.1

- Task 1.2.1: Implement User model
  - Extend Django AbstractUser with `role` and `is_verified` fields
  - Create migrations
  - Register in admin
  - **Acceptance:** Can create users via Django admin

- Task 1.2.2: Implement authentication API
  - Create registration endpoint with email/password
  - Create login endpoint returning JWT tokens
  - Create token refresh endpoint
  - Add role-based permissions
  - **Acceptance:** Can register, login, get JWT token via API

- Task 1.2.3: Implement React authentication
  - Create AuthContext/Provider
  - Create Login and Register pages
  - Store JWT in localStorage
  - Add protected route wrapper
  - **Acceptance:** Can register and login via UI, JWT stored, protected routes work

- Task 1.2.4: Write authentication tests
  - Unit tests for User model
  - Integration tests for auth endpoints
  - Test role-based permissions
  - **Acceptance:** All tests pass with >80% coverage

#### Subphase 1.3: Core RMA Model (depends on: 1.2)
**Dependencies:** 1.2

- Task 1.3.1: Implement RMA model
  - Create RMA model with all fields from specification
  - Add state field with choices
  - Add priority field (Low/Normal/High)
  - Create migrations
  - Register in admin
  - **Acceptance:** Can create RMAs via Django admin

- Task 1.3.2: Implement RMABatch model
  - Create RMABatch model for grouping
  - Link RMA to batch (optional FK)
  - **Acceptance:** Can create batches and link RMAs

- Task 1.3.3: Implement RMAAttachment model
  - Create RMAAttachment model with file field
  - Configure media storage
  - Link to RMA
  - **Acceptance:** Can upload files and link to RMAs

- Task 1.3.4: Implement RMAStateHistory model
  - Create model tracking state transitions
  - Add trigger to create history on RMA state change
  - **Acceptance:** State changes automatically create history entries

- Task 1.3.5: Write RMA model tests
  - Unit tests for RMA model methods
  - Test state transition validation
  - Test automatic history creation
  - **Acceptance:** All tests pass with >80% coverage

### Phase 2: RMA Management (depends on: Phase 1)
**Goal:** Implement CRUD operations and state management for RMAs

#### Subphase 2.1: RMA API Endpoints (depends on: Phase 1)
**Dependencies:** Phase 1

- Task 2.1.1: Implement RMA list/create endpoint
  - Create serializer for RMA
  - Create list/create view with user filtering
  - Add pagination
  - **Acceptance:** Users can list their RMAs and create new ones via API

- Task 2.1.2: Implement RMA detail/update endpoint
  - Create retrieve/update/delete view
  - Enforce ownership and role permissions
  - **Acceptance:** Users can view/update their RMAs, admins can update any RMA

- Task 2.1.3: Implement RMA state update endpoint
  - Create dedicated state transition endpoint (admin only)
  - Validate state transitions
  - Create state history entry
  - **Acceptance:** Admins can transition RMA states, invalid transitions rejected

- Task 2.1.4: Implement attachment endpoints
  - Create attachment upload endpoint
  - Create attachment list/delete endpoints
  - Add file validation (type, size)
  - **Acceptance:** Can upload, list, and delete attachments

- Task 2.1.5: Implement batch creation endpoint
  - Create endpoint accepting multiple RMA objects
  - Create batch record and link all RMAs
  - **Acceptance:** Can create multiple RMAs in single request with batch ID

- Task 2.1.6: Write RMA API tests
  - Integration tests for all RMA endpoints
  - Test permissions and ownership filtering
  - Test state transition validation
  - **Acceptance:** All tests pass with >80% coverage

#### Subphase 2.2: RMA User Interface (depends on: 2.1)
**Dependencies:** 2.1

- Task 2.2.1: Create RMA list component
  - Display user's active RMAs in table/cards
  - Add pagination controls
  - Add link to detail view
  - **Acceptance:** User dashboard displays RMAs with pagination

- Task 2.2.2: Create RMA detail component
  - Display all RMA fields
  - Display state history timeline
  - Display attachments with download links
  - **Acceptance:** Can view complete RMA details and history

- Task 2.2.3: Create RMA submission form
  - Multi-step form for RMA creation
  - File upload with preview
  - Optional batch creation (multiple devices)
  - **Acceptance:** Users can submit single or batch RMAs with attachments

- Task 2.2.4: Create archived RMAs view
  - List completed/rejected RMAs
  - Add filters for date range
  - **Acceptance:** Users can view their archived RMAs

### Phase 3: Admin Features (depends on: Phase 2)
**Goal:** Implement admin-specific features for RMA management and monitoring

#### Subphase 3.1: Admin RMA Management (depends on: Phase 2)
**Dependencies:** Phase 2

- Task 3.1.1: Create admin RMA list view
  - Display all RMAs (not filtered by user)
  - Add state filter buttons (Submitted, Approved, etc.)
  - Add priority highlighting
  - **Acceptance:** Admins see all RMAs with filters

- Task 3.1.2: Implement search functionality
  - Create search API endpoint with multi-field support
  - Add search bar to admin RMA list
  - Add advanced filters (state, priority, date range, batch)
  - **Acceptance:** Admins can search by SN/RMA#/owner and filter results

- Task 3.1.3: Create admin RMA detail/update view
  - Display all RMA fields (including admin-only)
  - Add inline editing for all fields
  - Add state transition buttons
  - **Acceptance:** Admins can update any field and transition states

- Task 3.1.4: Create RMA approval workflow UI
  - List of submitted RMAs pending approval
  - Approve/Reject buttons with reason dialog
  - **Acceptance:** Admins can approve/reject RMAs with reasons

#### Subphase 3.2: Admin Dashboard (depends on: 3.1)
**Dependencies:** 3.1

- Task 3.2.1: Implement dashboard metrics API
  - Create endpoint returning: counts by state, avg time per state, stale count
  - Add recent activity feed (last 20 state changes)
  - **Acceptance:** API returns dashboard metrics

- Task 3.2.2: Create dashboard UI
  - Display metrics as cards/charts
  - Display recent activity timeline
  - Add links to filtered RMA lists
  - **Acceptance:** Admin dashboard displays metrics and recent activity

- Task 3.2.3: Add dashboard charts
  - RMAs by state (bar chart)
  - Average time per state (bar chart)
  - RMAs over time (line chart)
  - **Acceptance:** Dashboard includes visual charts

### Phase 4: Notifications & Alerts (depends on: Phase 3)
**Goal:** Implement email notifications and stale RMA detection

#### Subphase 4.1: Email Notification System (depends on: Phase 3)
**Dependencies:** Phase 3

- Task 4.1.1: Configure email backend
  - Set up SMTP settings
  - Create email templates (HTML + plain text)
  - **Acceptance:** Can send test emails

- Task 4.1.2: Implement user notifications
  - Send email on RMA state changes
  - Include RMA details and direct link
  - **Acceptance:** Users receive emails when RMA state changes

- Task 4.1.3: Implement admin notifications
  - Send email to admins on new RMA submission
  - Send email to admins on user registration
  - **Acceptance:** Admins receive notification emails

- Task 4.1.4: Write notification tests
  - Test email sending on state changes
  - Test email content correctness
  - **Acceptance:** All tests pass

#### Subphase 4.2: Stale RMA Detection (depends on: 4.1)
**Dependencies:** 4.1

- Task 4.2.1: Implement stale configuration model
  - Create StateTimeout model (state + priority → timeout_hours)
  - Create admin interface for configuration
  - Add default timeouts
  - **Acceptance:** Admins can configure timeouts per state and priority

- Task 4.2.2: Implement stale detection logic
  - Create management command to check for stale RMAs
  - Compare current time vs last state change + configured timeout
  - Mark RMAs as stale
  - **Acceptance:** Command identifies stale RMAs correctly

- Task 4.2.3: Implement stale notifications
  - Send email to admins for newly stale RMAs
  - Include RMA details and link
  - **Acceptance:** Admins receive stale RMA alerts

- Task 4.2.4: Add stale indicators to UI
  - Show stale badge on RMA list items
  - Filter RMAs by stale status
  - Highlight stale RMAs in dashboard
  - **Acceptance:** Stale RMAs are visually distinct in UI

- Task 4.2.5: Set up scheduled task
  - Configure Celery or cron job to run daily
  - Run stale detection command
  - **Acceptance:** Stale detection runs automatically daily

### Phase 5: Audit & History (depends on: Phase 4)
**Goal:** Implement comprehensive audit trail

#### Subphase 5.1: Audit Logging (depends on: Phase 4)
**Dependencies:** Phase 4

- Task 5.1.1: Implement AuditLog model
  - Create model tracking all field changes
  - Store: timestamp, user, object type, object id, field, old value, new value
  - **Acceptance:** Model can store change records

- Task 5.1.2: Implement audit logging signals
  - Add post_save signal to RMA model
  - Compare old vs new values and log changes
  - **Acceptance:** RMA updates automatically create audit logs

- Task 5.1.3: Create audit history API
  - Create endpoint to retrieve audit logs for RMA
  - Filter by user role (users see limited, admins see all)
  - **Acceptance:** Can retrieve audit history via API

- Task 5.1.4: Add audit history to UI
  - Display audit trail in RMA detail view
  - Format as timeline with user/timestamp
  - **Acceptance:** Users see audit history in RMA detail

### Phase 6: Testing & Refinement (depends on: Phase 5)
**Goal:** Comprehensive testing and polish

#### Subphase 6.1: Testing (depends on: Phase 5)
**Dependencies:** Phase 5

- Task 6.1.1: Backend integration tests
  - Test complete user workflows (register → submit RMA → track)
  - Test complete admin workflows (approve user → approve RMA → update state)
  - Test stale RMA workflow
  - **Acceptance:** All integration tests pass

- Task 6.1.2: Frontend component tests
  - Test key components with React Testing Library
  - Test form validation
  - **Acceptance:** Frontend tests pass

- Task 6.1.3: API load testing
  - Test API with 1000+ RMAs
  - Verify pagination performance
  - Verify search performance
  - **Acceptance:** API responds in <2s for typical queries

- Task 6.1.4: Manual E2E testing
  - Test complete user journey manually
  - Test complete admin journey manually
  - Test edge cases and error handling
  - **Acceptance:** No critical bugs found

#### Subphase 6.2: Polish & Documentation (depends on: 6.1)
**Dependencies:** 6.1

- Task 6.2.1: UI/UX polish
  - Add loading states
  - Add error handling and user feedback
  - Improve responsive design
  - **Acceptance:** UI feels polished and responsive

- Task 6.2.2: Documentation
  - Write README with setup instructions
  - Document API endpoints
  - Write admin user guide
  - Write end user guide
  - **Acceptance:** Documentation complete and accurate

- Task 6.2.3: Deployment preparation
  - Create production Docker images
  - Document deployment process
  - Configure production settings (DEBUG=False, ALLOWED_HOSTS, etc.)
  - **Acceptance:** Production deployment documented

## Testing Strategy

### Unit Tests
- ! MUST test all model methods and properties
- ! MUST test all serializers
- ! MUST test business logic functions
- ! MUST achieve >80% code coverage

### Integration Tests
- ! MUST test all API endpoints with various user roles
- ! MUST test authentication and authorization
- ! MUST test state transitions and validation
- ! MUST test email sending (with mock)
- ! MUST test stale RMA detection logic

### Manual Testing
- ! MUST test complete user registration and RMA submission flow
- ! MUST test complete admin approval and RMA management flow
- ! MUST test file uploads with various file types and sizes
- ! MUST test email notifications end-to-end
- ~ SHOULD test with realistic data volumes (100+ RMAs)

### Test Data
- ~ SHOULD include test fixtures with sample RMAs
- ~ SHOULD include management command to generate test data

## Deployment

### Development Environment
- Docker Compose with Django + React + SQLite
- Hot reloading for both frontend and backend
- Local email backend (console)

### Production Environment
- Docker containers deployed to host/cloud
- Nginx reverse proxy
- HTTPS with Let's Encrypt
- SMTP email service (e.g., SendGrid, AWS SES)
- SQLite database (with backup strategy)
- Static file serving via Nginx
- Celery worker for background tasks (or cron for simplicity)

### Environment Variables
- ! MUST use environment variables for:
  - SECRET_KEY
  - DEBUG
  - ALLOWED_HOSTS
  - DATABASE_URL (if PostgreSQL)
  - EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD
  - JWT_SECRET_KEY

### Backup Strategy
- ~ SHOULD implement daily SQLite database backups
- ~ SHOULD backup uploaded files
- ~ SHOULD test restore procedure

## Future Enhancements

The following features are explicitly OUT OF SCOPE for initial release but may be considered later:

- ? MAY add SMS notifications
- ? MAY add Slack/Teams integration
- ? MAY add CSV/Excel export of RMA data
- ? MAY migrate to PostgreSQL for larger deployments
- ? MAY add real-time WebSocket updates
- ? MAY add custom report builder
- ? MAY add RMA cost analytics and reporting
- ? MAY add device inventory management
- ? MAY add shipping label generation
- ? MAY add customer portal with tracking link (no login required)
