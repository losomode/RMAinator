# RMAinator

> *"Behold, the RMA-inator! It tracks every return, repair, and replacement with the efficiency of... well, a really efficient tracking system!"*

**RMAinator** is a company-scoped RMA (Return Merchandise Authorization) platform for tracking device repairs from customer submission through return shipment. It is part of the [Inator Platform](https://github.com/losomode/inator) and integrates with Authinator (authentication) and USERinator (companies & roles).

[![Django](https://img.shields.io/badge/django-6.0-green)](https://www.djangoproject.com/) [![React](https://img.shields.io/badge/react-18-blue)](https://reactjs.org/) [![Tests](https://img.shields.io/badge/tests-87%20passing-success)](./backend)

---

## 🗺️ Table of Contents

1. [Quick Start](#-quick-start)
2. [Core Concept: Groups](#-core-concept-groups)
3. [The Status Workflow](#-the-status-workflow)
4. [Creating an RMA](#-creating-an-rma)
5. [Dashboard](#-dashboard)
6. [Group Detail Page](#-group-detail-page)
7. [Individual RMA Ticket](#-individual-rma-ticket)
8. [Admin Tools](#-admin-tools)
9. [Roles & Permissions](#-roles--permissions)
10. [API Reference](#-api-reference)
11. [Configuration & Deployment](#-configuration--deployment)
12. [Troubleshooting](#-troubleshooting)

---

## 🚀 Quick Start

### Platform Mode (Recommended)

```bash
# From the platform root (inator/)
task setup           # Sets up all inators
task start:all       # Starts all services + gateway

# Access at http://localhost:8080/rma/
```

### Demo Data

```bash
# From the platform root (inator/)
task setup:demodb        # Build demo databases
task demodb:activate     # Activate demo data
task restart:all
```

Test accounts: `admin/admin` (full access), `bob.manager/manager` (Acme only), `frank.manager/manager` (Globex only).

### After Pulling New Code

Always run migrations before starting:

```bash
task backend:migrate
```

---

## 📦 Core Concept: Groups

**Every RMA in this system belongs to a group.** When you submit one or more devices for return, a Group is automatically created to contain them. This is the fundamental unit of organization.

- A group represents a **single return event** — one customer, one company, one address, one date.
- Even a single device still lives inside a group.
- Groups have a **name** (auto-generated as `CompanyName Month YYYY`, editable by admins), a **company assignment**, a **return shipping address**, and a **creation date**.
- The creation date controls which year the group appears under on the dashboard and can be adjusted retroactively by admins to accurately reflect historical data.

**Think at the group level, not the device level.** You approve a batch, you receive a batch, you ship a batch. Individual device actions are available when devices within a group are at different stages.

---

## 🔄 The Status Workflow

Each device (RMA ticket) moves through the following states:

```
SUBMITTED → APPROVED → RECEIVED → DIAGNOSED → REPAIRED ─┐
                                               REPLACED ─┤→ IN QA → READY FOR RETURN → SHIPPED → COMPLETED
                       └── REJECTED (terminal)
```

### State Descriptions

| State | Who acts | What it means |
|-------|----------|---------------|
| **SUBMITTED** | Customer | Device registered for return, awaiting admin review |
| **APPROVED** | Admin | Admin confirms the RMA is valid |
| **RECEIVED** | Admin | Physical device has arrived at the repair facility |
| **DIAGNOSED** | Admin | Root cause identified, technician is assessing |
| **REPAIRED** | Admin | Device repaired (original unit) |
| **REPLACED** | Admin | Device replaced with a different unit |
| **IN QA** | Admin | Repair complete, device in pre-shipment QA testing |
| **READY FOR RETURN** | Admin | Passed QA, staged and awaiting shipment |
| **SHIPPED** | Admin | Device shipped back to customer |
| **COMPLETED** | Admin | Process closed |
| **REJECTED** | Admin | RMA declined (terminal — cannot be reopened) |

### Workflow Automation

Several fields are populated **automatically** when you move to specific states — do not manually update them:

| When you transition to... | These fields are auto-set |
|--------------------------|--------------------------|
| **RECEIVED** | RMA Received Date → today |
| **SHIPPED** | Return Date → today, Return Tracking Number → tracking number you provide |

> If you manually edit these fields in the Admin Fields panel, you'll be prompted to confirm — this is a safeguard against accidentally overwriting workflow data.

### Notes in the Workflow

Any note added during a status transition is stored in the **Status History** and also surfaces as the **"Recent Updates"** note on the Group Detail page. Notes persist — if you add a note at DIAGNOSED and skip adding one for REPAIRED, the DIAGNOSED note continues to display until a newer one is added.

---

## ➕ Creating an RMA

Navigate to **+ New RMA** from the top right of any page.

### Form Fields

**Company** *(required)* — Admin users select from all companies. Non-admin users see their own company pre-filled (read-only). All RMAs must have a company.

**Return Shipping Address** *(required)* — Structured fields:
- Contact Name *(required)*
- Address Line 1 *(required)*
- Address Line 2 *(optional — apartment, suite, floor, etc.)*
- City, State/Province, ZIP *(required)*
- Country *(required)*

The company name is pulled automatically from the Company dropdown — you do not need to re-enter it.

**Per Device** — click **+ Add Another Device** to include multiple devices in the same group:

| Field | Required | Notes |
|-------|----------|-------|
| Serial Number | ✅ | e.g. `0002067` |
| Device Type | ✅ | Select from dropdown (see options below) |
| IPN | ❌ | Internal Part Number, if your company tracks by this |
| Issue Description | ✅ | Describe the fault in detail |
| Attachments | ❌ | Photos, PDFs, diagnostic reports |

**Device Type options:**
- TX2 Camera (Standard Lens)
- TX2 Camera (Long Range Lens)
- TX2 Node
- Orin NX Node
- Orin Nano Camera (Standard Lens)
- Orin Nano Camera (Long Range Lens)

### What Happens on Submit

- A **Group** is created with name `CompanyName Month YYYY`
- Each device becomes an RMA ticket in **SUBMITTED** state
- Uploaded files are attached to their respective tickets
- Priority defaults to **NORMAL** — admins can change it in Admin Fields after receiving the device

---

## 🏠 Dashboard

The dashboard is the main view of all RMA activity. It defaults to **By RMA Group**, organized by year with newest groups at the top.

### Filter Buttons

| Button | Shows |
|--------|-------|
| **All** (default) | Every group regardless of status |
| **Active Only** | Groups with devices still in progress |
| **Completed Only** | Groups where all devices are finished |

### Year Rail

A small vertical blue tab on the left marks the year as you scroll. This makes navigating a long history of groups easy — you always know which year you're viewing.

The year is determined by the **group's creation date**, which admins can adjust retroactively for historical data entry.

### Group Cards

Each group shows the group name, company badge (admins only), device count, and a collapsible list of its devices. Each device in the list shows:
- RMA #, serial number, device type
- Most recent workflow note (if any, shown in blue italic)
- Current status badge

Click the group name to open the **Group Detail page**.

---

## 📋 Group Detail Page

Access from: dashboard group headers, any individual RMA ticket (📦 **View Group** button), or Admin Tools → RMA Management (**View** button).

### Group Header

Shows group name (✏️ editable by admins), company, device count, creation date, and return shipping address.

### Devices

All devices in the group with their RMA #, serial number, device type, most recent note, and status. Click any device to open its individual ticket.

### Return Shipments

A record of every shipment associated with this group. Each entry shows:
- Return tracking number
- Ship date
- Number of devices

Expand any shipment to see the full device table (RMA #, serial, device type, status).

If no shipments have occurred yet, a placeholder message is shown.

---

### Bulk Actions (Admin only)

| Button | Requires | Action |
|--------|---------|--------|
| **Approve** | ≥1 SUBMITTED device | Selection modal → approve chosen devices |
| **Receive** | ≥1 APPROVED device | Selection modal → mark chosen devices as received |
| **Ship All** | ALL devices are READY FOR RETURN | Enter tracking # → ships entire group |
| **Create Partial Shipment** | SOME devices are READY FOR RETURN (not all) | Select devices + enter tracking # → ships selected devices |
| **Complete Shipped** | ≥1 SHIPPED device | Moves all SHIPPED devices to COMPLETED (can repeat as batches complete) |

**Selection modals (Approve / Receive / Partial Shipment):**
- All devices are listed
- Eligible devices have enabled checkboxes
- Ineligible devices are grayed-out with their current state shown
- **Select All Eligible** button at the top for quick selection

**Tracking number requirement:** Ship All and Partial Shipment both require a return tracking number. This is applied to every device in that shipment and auto-fills the Return Tracking Number and Return Date in their admin fields.

> **Typical batch workflow:**
> 1. Customer submits → click **Approve** (select all or just the valid ones)
> 2. Devices arrive → click **Receive** (select what physically arrived)
> 3. Devices go through repair individually via status workflow
> 4. As devices become ready → **Create Partial Shipment** for each wave, or **Ship All** when everything is ready
> 5. After confirming delivery → **Complete Shipped**

---

## 🎫 Individual RMA Ticket

Access from dashboard cards, group device lists, or Admin Tools.

### Navigation

- **← Back to Dashboard** — returns to the main dashboard
- **📦 View Group** — jumps directly to the group (shown when RMA belongs to a group)

### Device Information

Customer-submitted details: serial number, device type, company, priority, creation date, issue description, and attachments. Attachments are downloadable links.

> **Note on file types:** HEIC and other Apple image formats download correctly but may not preview inline in the browser — open with Photos or Preview on macOS.

### Update Status (Admin only)

Advances the device through the workflow:

- **Most states** — optional Notes field for recording observations (stored in status history and shown as "Recent Updates" on the group page)
- **→ SHIPPED** — Notes is replaced by a **required Return Tracking Number** field; the button stays grayed out until filled. A note below the field reminds you to use the group's Ship All action if shipping multiple devices.
- **→ REJECTED** — required Rejection Reason field

Admins can also **revert** a device to an earlier state using the Revert selector for error correction.

### Admin Fields (Admin only)

Click **✏️ Edit** to modify, **Save** to apply. A confirmation prompt appears if you manually change any of the three workflow-managed fields (RMA Received Date, Return Date, Return Tracking Number).

**Field reference:**

| Field | Notes |
|-------|-------|
| Priority | Low / Normal / High |
| First Ship Date | Original ship date from the manufacturer/customer |
| RMA Received Date | *Auto-set when → RECEIVED* |
| Return Date | *Auto-set when → SHIPPED* |
| Cost to Repair | |
| Device MAC | MAC address of the device |
| Return Tracking Number | *Auto-set when → SHIPPED* |
| Root Cause | Technical root cause of the failure |
| Parts Replaced | Dynamic list — default 2 rows, click + to add more |
| **Repair Notes** | Free-form text for internal notes, observations, anything worth documenting about this repair |

**Repair QA Checklist** — complete before marking Ready for Return:

| Item | Note |
|------|------|
| Re-flashed | Reveals an Image Version field when checked |
| /data partition on NVMe | *(if applicable)* |
| Services Installed & Enabled | |
| Uptime >24 Hours | |
| Stream Uptime >24 Hours | *(if applicable)* |
| Lens Control Verified | *(if applicable)* |

### Status History

Full timeline of every state transition — who, when, and any notes attached.

---

## 🛠️ Admin Tools

Visible to admin-level users only. Access from the top navigation.

### Admin Dashboard

At-a-glance metrics:
- Total, Active, and **Finished** RMAs
- Stale RMAs (stuck in a state too long — configure thresholds in Django admin)
- Counts by state
- Recent activity feed across all companies

### Admin RMA Management (`/rma/admin/manage`)

**By Group view** (default) — every group with collapsible device rows.

**Group row actions:**
| Button | Action |
|--------|--------|
| **View** | Opens the Group Detail page |
| **📅 Date** | Edit the group's creation date (for historical backdating) |
| **🗑 Delete** | Permanently deletes the group AND all devices (⚠️ irreversible — move devices first) |

**Device row actions:**
| Button | Action |
|--------|--------|
| **View** | Opens the individual RMA ticket |
| **Move** | Moves the device to a different group |
| **Delete** | Permanently deletes this device (with confirmation) |

Toggle to **📋 Flat List** for search/filter at the individual RMA level.

#### Backdating Groups for Historical Data

When entering historical RMA records, use the **📅 Date** button to set the group to the correct month/year. After saving you'll be prompted: *"Also change the creation date of all tickets in this group to the same date?"* — click Yes to backdate the device tickets too. The group will then appear under the correct year on the dashboard.

---

## 🔐 Roles & Permissions

RMAinator enforces company-scoped access control via JWT roles from Authinator/USERinator:

| Role Level | Who | Access |
|-----------|-----|--------|
| **ADMIN (100)** | Platform administrators | All companies, all RMAs, all admin tools |
| **MANAGER (30)** | Company managers | Create and manage RMAs for their company only |
| **MEMBER (10)** | Company members | View RMAs for their company only (read-only) |

Non-admin users only see RMAs belonging to their company. Admin fields (QA checklist, parts, device MAC, repair notes, tracking numbers) are hidden from non-admins.

---

## 📡 API Reference

All requests require a valid JWT from Authinator:
```
Authorization: Bearer <jwt_token>
```

### Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| `GET` | `/api/rma/` | List RMAs (company-scoped) | All |
| `POST` | `/api/rma/group/` | Create RMA group | All |
| `GET` | `/api/rma/group/{id}/` | Group detail + nested RMAs + shipments | All |
| `PATCH` | `/api/rma/group/{id}/` | Update group (name, date, address) | Admin |
| `DELETE` | `/api/rma/group/{id}/` | Delete group + all its RMAs | Admin |
| `POST` | `/api/rma/group/{id}/bulk-state/` | Bulk state transition | Admin |
| `GET` | `/api/rma/{id}/` | RMA detail (full fields) | All |
| `PATCH` | `/api/rma/{id}/` | Update RMA admin fields | Admin |
| `POST` | `/api/rma/{id}/state/` | Transition to new state | Admin |
| `POST` | `/api/rma/{id}/attachments/` | Upload attachment | All |
| `GET` | `/api/rma/search/` | Search and filter RMAs | Admin |
| `GET` | `/api/rma/admin/dashboard/` | Admin metrics | Admin |

### Bulk State Body

```json
{
  "state": "APPROVED" | "RECEIVED" | "SHIPPED" | "COMPLETED",
  "rma_ids": [1, 2, 3],           // optional — omit to target all eligible
  "tracking_number": "UPS-1Z..."  // required when state = "SHIPPED"
}
```

Atomicity: if any device is ineligible, the entire operation is rejected and nothing changes.

### Create Group Body

```json
{
  "company_id": 42,
  "return_shipping_address": "John Smith\nAcme Corp\n123 Main St\nSan Francisco, CA 94105\nUSA",
  "rmas": [
    {
      "serial_number": "0002067",
      "device_type": "TX2 Camera (Standard Lens)",
      "fault_notes": "Camera not powering on",
      "company_id": 42
    }
  ]
}
```

---

## ⚙️ Configuration & Deployment

### Environment Variables

```bash
# backend/.env
DEBUG=False
SECRET_KEY=change-this-in-production

AUTHINATOR_API_URL=http://localhost:8001/api/auth/

USERINATOR_API_URL=http://localhost:8004/api/users/
USERINATOR_SERVICE_KEY=your-service-key

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

### Migrations

```bash
task backend:migrate   # always run after pulling new code
```

Migration history:
- `0001_initial` — base schema
- `0002_rename_batch_to_group`
- `0003_rma_company_id`
- `0004_speskin_extensions` — device_type, ipn, device_mac, JSON parts list, QA checklist, IN QA / READY FOR RETURN states, group enhancements
- `0005_rmagroup_editable_created_at` — allow backdating
- `0006_rma_repair_notes`

### Production Checklist

- [ ] `DEBUG=False`, strong `SECRET_KEY`
- [ ] `ALLOWED_HOSTS` set
- [ ] Authinator + USERinator accessible
- [ ] SMTP email configured
- [ ] PostgreSQL (not SQLite)
- [ ] S3-compatible storage for uploads
- [ ] Caddy/Nginx routes `/media/*` → Django backend (port 8002)
- [ ] `task backend:migrate` and `task backend:collectstatic` run
- [ ] Cron for stale RMA checks: `0 9 * * * python manage.py check_stale_rmas`

---

## 🐛 Troubleshooting

**Attachment downloads show as HTML text**
The gateway needs a `/media/*` route pointing to the Django backend. In the Inator platform, `Caddyfile.dev` on `speskin-dev` includes this. Restart Caddy after updating the config.

**📦 "View Group" button not showing on RMA tickets**
Run `task backend:migrate` — the detail serializer fix requires the latest code.

**Admin fields or tools not showing**
JWT must include `role_level ≥ 100`. Verify the user's role in USERinator.

**"Failed to load company" errors**
USERinator must be running. Check with `task start:all` from the platform root and verify `USERINATOR_API_URL` is set.

**HEIC images**
HEIC files download correctly but most browsers can't display them inline. Open with Photos or Preview on macOS.

**Backend won't start**
```bash
task backend:migrate               # check for pending migrations
source .venv/bin/activate
pip install -r backend/requirements.txt
python backend/manage.py check
```

---

## 📦 Repository

**GitHub**: [losomode/RMAinator](https://github.com/losomode/RMAinator) · active branch: `speskin-dev`

## 📝 License

MIT — See [LICENSE](LICENSE) for details.

---

*Part of the [Inator Platform](https://github.com/losomode/inator)*
