# Product Requirements Document: RMAinator

**Generated**: 2026-02-19
**Status**: Ready for AI Interview

## Initial Input

**Project Description**: This will be a multi user web tool with user and admin views.  Users will use the site to report RMA devices and check on the status of those devices through the RMA process.  Admins will use the site to update the progrss of RMA devices and report on status.  The site will allow admins to set up timing nad notification rules so that RMA progress does not grow stale or get lost.

**I want to build RMAinator that has the following features:**
1. MUST have user authentication for usrs and admins
2. MUST have separate user and admin views
3. MUST allow users, once verified to report device issues and request RMA
4. MUST allow admins to see new RMA requests and appove or reject
5. MUST allow users to see all active and archived RMA devices that belong to them including history and progress for active RMAs
6. MUST allow admins to update status and state of RMA devices
7. MUST allow admins to have rules to trigger "stale RMA" devices
8. SHOULD include alerts for admins for any and all "stale RMA devices
9. MUST reference the documents in the Refernece directory to see existing RMA tracking and model data for the app after the data there
10. MUST includde all fields in teh Refernece documents
11. MUST allow admins to serch for RMA by batch, device info (serial number, owner, etc)
12. MUST NOT allow users to see other another users RMA or devices
13. MUST enforce a state flow for each RMA device
---

# Specification Generation

Agent workflow for creating project specifications via structured interview.

Legend (from RFC2119): !=MUST, ~=SHOULD, ≉=SHOULD NOT, ⊗=MUST NOT, ?=MAY.

## Input Template

```
I want to build RMAinator that has the following features:
1. [feature]
2. [feature]
...
N. [feature]
```

## Interview Process

- ~ Use Claude AskInterviewQuestion when available (emulate it if not available)
- ! If Input Template fields are empty: ask overview, then features, then details
- ! Ask **ONE** focused, non-trivial question per step
- ⊗ ask more than one question per step; or try to sneak-in "also" questions
- ~ Provide numbered answer options when appropriate
- ! Include "other" option for custom/unknown responses
- ! make it clear which option you feel is RECOMMENDED
- ! when you are done, append to the end of this file all questions asked and answers given.

**Question Areas:**

- ! Missing decisions (language, framework, deployment)
- ! Edge cases (errors, boundaries, failure modes)
- ! Implementation details (architecture, patterns, libraries)
- ! Requirements (performance, security, scalability)
- ! UX/constraints (users, timeline, compatibility)
- ! Tradeoffs (simplicity vs features, speed vs safety)

**Completion:**

- ! Continue until little ambiguity remains
- ! Ensure spec is comprehensive enough to implement

## Output Generation

- ! Generate as SPECIFICATION.md
- ! follow all relevant deft guidelines
- ! use RFC2119 MUST, SHOULD, MAY, SHOULD NOT, MUST NOT wording
- ! Break into phases, subphases, tasks
- ! end of each phase/subphase must implement and run testing until it passes
- ! Mark all dependencies explicitly: "Phase 2 (depends on: Phase 1)"
- ! Design for parallel work (multiple agents)
- ⊗ Write code (specification only)

## Afterwards

- ! let user know to type "implement SPECIFICATION.md" to start implementation

**Structure:**

```markdown
# Project Name

## Overview

## Requirements

## Architecture

## Implementation Plan

### Phase 1: Foundation

#### Subphase 1.1: Setup

- Task 1.1.1: (description, dependencies, acceptance criteria)

#### Subphase 1.2: Core (depends on: 1.1)

### Phase 2: Features (depends on: Phase 1)

## Testing Strategy

## Deployment
```

## Best Practices

- ! Detailed enough to implement without guesswork
- ! Clear scope boundaries (in vs out)
- ! Include rationale for major decisions
- ~ Size tasks for 1-4 hours
- ! Minimize inter-task dependencies
- ! Define clear component interfaces

## Anti-Patterns

- ⊗ Multiple questions at once
- ⊗ Assumptions without clarifying
- ⊗ Vague requirements
- ⊗ Missing dependencies
- ⊗ Sequential tasks that could be parallel

---

## Interview Session - 2026-02-20

### Questions and Answers

**Q1: Technology Stack - Backend & Framework**
What technology stack would you like to use for RMAinator's backend?
1. Python + Django (RECOMMENDED)
2. Python + FastAPI
3. Node.js + Express
4. Ruby on Rails
5. Other

**A1:** Option 1 - Python + Django

---

**Q2: Frontend Framework**
What frontend framework would you like to use for the user and admin interfaces?
1. Django Templates + HTMX (RECOMMENDED)
2. React
3. Vue.js
4. Next.js
5. Django Templates only
6. Other

**A2:** Option 2 - React

---

**Q3: Database**
What database would you like to use for RMAinator?
1. PostgreSQL (RECOMMENDED)
2. SQLite
3. MySQL/MariaDB
4. MongoDB
5. Other

**A3:** Option 2 - SQLite

---

**Q4: Deployment Environment**
Where do you plan to deploy RMAinator?
1. Docker containers (RECOMMENDED)
2. Traditional server
3. Cloud platform (AWS, GCP, Azure)
4. Heroku or similar PaaS
5. Local network only
6. Other

**A4:** Option 1 - Docker containers

---

**Q5: Authentication Method**
How should users and admins authenticate to RMAinator?
1. Email/Password with Django's built-in auth (RECOMMENDED)
2. OAuth/SSO
3. Email/Password + Two-Factor Authentication
4. LDAP/Active Directory integration
5. Email magic links
6. Other

**A5:** Option 1 - Email/Password with Django's built-in auth

---

**Q6: RMA Device State Flow**
What states should an RMA device go through?
1. Submitted → Approved/Rejected → Received → Diagnosed → Repaired/Replaced → Shipped → Completed (RECOMMENDED)
2. Submitted → In Progress → Resolved → Closed
3. New → Approved → Processing → Testing → Closed
4. Custom flow
5. Other

**A6:** Option 1 - Comprehensive flow

---

**Q7: Stale RMA Alert Rules**
How should stale RMA alerts work?
1. Per-state timeouts (RECOMMENDED: configurable per state)
2. Global timeout
3. Business rules engine
4. Manual flagging only
5. Other

**A7:** Option 1 - Per-state timeouts

---

**Q8: Admin Alert Notification Method**
How should admins be notified about stale RMA devices?
1. Email notifications (RECOMMENDED)
2. In-app notifications only
3. Email + in-app notifications
4. Slack/Teams integration
5. SMS/text messages
6. Other

**A8:** Option 1 - Email notifications

---

**Q9: Reference Documents**
Do you have reference documents for existing RMA tracking model?
1. I have reference documents
2. Use standard RMA fields (RECOMMENDED)
3. Other

**A9:** Option 1 - Reference documents available at /Users/ryan/opt/sighthound/RMAinator/Reference

**Reference File Analysis:**
- File: Sighthound RMA Tracker.xlsx
- Fields identified: SN, RMA, First Ship, RMA rcvd, Yrs in field, Return date, Root Cause, Part(s) Replaced, Cost to Repair, RMA History?, Fault/Notes, TX2 Mac, Script ran?, Services enabled?, Uptime good?, Stream good?, Ship ready

---

**Q10: User Roles & Permissions**
Should there be different types of admin users with different permission levels?
1. Single admin role (RECOMMENDED)
2. Tiered admin roles
3. Role-based permissions
4. Other

**A10:** Option 1 - Single admin role

---

**Q11: Batch Tracking**
What does "batch" mean in your RMA context?
1. Manufacturing batch number
2. Shipment batch
3. RMA submission batch (multiple RMAs submitted together)
4. Date-based grouping
5. Custom grouping field
6. Other

**A11:** Option 3 - RMA submission batch

---

**Q12: User Verification Process**
What does "verified" mean for users?
1. Email verification only (RECOMMENDED)
2. Admin approval required
3. Automatic verification
4. Domain-based verification
5. Other

**A12:** Option 2 - Admin approval required

---

**Q13: RMA Archive Logic**
When should an RMA be considered "archived"?
1. When state reaches "Completed" (RECOMMENDED)
2. When state reaches "Shipped"
3. Manual archive by admin
4. Time-based auto-archive
5. Other

**A13:** Option 1 - When state reaches "Completed"

---

**Q14: Backend-Frontend Communication**
How should Django backend and React frontend communicate?
1. Django REST Framework (DRF) with REST API (RECOMMENDED: JWT auth)
2. Django + GraphQL
3. Django templates serving React
4. Django REST + WebSockets
5. Other

**A14:** Option 1 - Django REST Framework with REST API

---

**Q15: File Attachments**
Should users and admins be able to attach files to RMAs?
1. Yes, with photo uploads (RECOMMENDED)
2. Yes, any file type
3. No file attachments needed
4. Links to external storage only
5. Other

**A15:** Option 2 - Yes, any file type

---

**Q16: Admin Reporting Features**
What kind of reports do admins need?
1. Dashboard with metrics (RECOMMENDED)
2. Exportable reports (CSV/Excel)
3. Dashboard + exports
4. Custom report builder
5. Other

**A16:** Option 1 - Dashboard with metrics

---

**Q17: Rejected RMA Handling**
When an admin rejects an RMA, what should happen?
1. Mark as rejected and archive (RECOMMENDED)
2. Reject with feedback, allow resubmission
3. Soft reject
4. Other

**A17:** Option 1 - Mark as rejected and archive

---

**Q18: User Notifications**
Should users be notified when their RMA status changes?
1. Email notifications on state changes (RECOMMENDED)
2. In-app notifications only
3. Email + in-app notifications
4. No automatic notifications
5. Other

**A18:** Option 1 - Email notifications on state changes

---

**Q19: RMA Priority Levels**
Should RMAs have priority/urgency levels?
1. Yes, with 3 levels (RECOMMENDED: Low, Normal, High)
2. Yes, with 5 levels
3. No priority system needed
4. Other

**A19:** Option 1 - Yes, with 3 levels (Low, Normal, High)

---

**Q20: Audit Trail**
Should the system track who made changes to RMAs and when?
1. Yes, full audit trail (RECOMMENDED)
2. Basic history (state changes only)
3. No audit trail needed
4. Other

**A20:** Option 1 - Yes, full audit trail

---

**Q21: Technical Diagnostic Fields**
Who should be able to view/edit technical fields (TX2 Mac, Script ran?, etc.)?
1. Admin-only fields (RECOMMENDED)
2. Visible to users, editable by admins only
3. Users can fill in some fields at submission
4. Other

**A21:** Option 1 - Admin-only fields

---

**Q22: Admin Search & Filter Capabilities**
What level of search functionality is needed?
1. Multi-field search + filters (RECOMMENDED)
2. Full-text search across all fields
3. Advanced query builder
4. Basic search only
5. Other

**A22:** Option 1 - Multi-field search + filters

---

**Q23: Testing Requirements**
What level of automated testing should be included?
1. Unit + Integration tests (RECOMMENDED)
2. Unit tests only
3. End-to-end tests
4. All of the above
5. Manual testing only
6. Other

**A23:** Option 1 - Unit + Integration tests

---

### Summary

**Technology Stack:**
- Backend: Python + Django + Django REST Framework
- Frontend: React
- Database: SQLite
- Deployment: Docker containers
- Authentication: Email/Password with JWT

**Key Decisions:**
- RMA State Flow: Submitted → Approved/Rejected → Received → Diagnosed → Repaired/Replaced → Shipped → Completed
- Stale Alerts: Per-state configurable timeouts, affected by priority
- Notifications: Email for both users (state changes) and admins (stale RMAs)
- User Verification: Admin approval required
- Batch Tracking: RMA submission batches
- Priority Levels: Low, Normal, High
- Audit Trail: Full audit trail of all changes
- File Attachments: Any file type supported
- Search: Multi-field search with filters
- Testing: Unit + Integration tests

**Specification Generated:** SPECIFICATION.md

**Status:** COMPLETE - Ready for implementation

