/** Shared domain types for RMAinator frontend. */

// -----------------------------------------------------------------------------
// Enums / Union Types
// -----------------------------------------------------------------------------

/** All possible RMA workflow states. */
export type RMAState =
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RECEIVED'
  | 'DIAGNOSED'
  | 'REPAIRED'
  | 'REPLACED'
  | 'SHIPPED'
  | 'COMPLETED';

/** RMA priority levels. */
export type RMAPriority = 'LOW' | 'NORMAL' | 'HIGH';

/** User roles within the application (must match Authinator backend). */
export type UserRole = 'ADMIN' | 'USER';

// -----------------------------------------------------------------------------
// Core Domain Models
// -----------------------------------------------------------------------------

/** Authenticated user profile. */
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  date_joined: string;
  is_verified?: boolean;
}

/** File attached to an RMA. */
export interface RMAAttachment {
  id: number;
  filename: string;
  file_size: number;
}

/** A single entry in an RMA's state-transition history. */
export interface RMAStateHistory {
  id: number;
  from_state: RMAState | null;
  to_state: RMAState;
  changed_at: string;
  changed_by: { username: string } | null;
  notes: string | null;
}

/** Full RMA record as returned by the API. */
export interface RMA {
  id: number;
  rma_number: string;
  serial_number: string;
  state: RMAState;
  priority: RMAPriority;
  group_id: number | null;
  fault_notes: string;
  first_ship_date: string | null;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  rejection_reason?: string;
  owner?: { username: string };
  attachments?: RMAAttachment[];
  state_history?: RMAStateHistory[];
}

// -----------------------------------------------------------------------------
// Admin Dashboard
// -----------------------------------------------------------------------------

/** Summary counters on the admin dashboard. */
export interface AdminSummary {
  total_rmas: number;
  active_rmas: number;
  archived_rmas: number;
  stale_rmas_count: number;
}

/** A stale RMA entry shown in the admin dashboard. */
export interface StaleRMA {
  id: number;
  rma_number: string;
  serial_number: string;
  state: RMAState;
  priority: RMAPriority;
  days_in_state: number;
}

/** A recent-activity entry on the admin dashboard. */
export interface RecentActivity {
  rma_number: string;
  serial_number: string;
  from_state: RMAState | null;
  to_state: RMAState;
  changed_by: string;
  changed_at: string;
  notes: string | null;
}

/** Trend counts for admin dashboard. */
export interface AdminTrends {
  last_7_days: number;
  last_30_days: number;
  last_90_days: number;
}

/** Complete admin dashboard payload. */
export interface AdminDashboardMetrics {
  summary: AdminSummary;
  state_counts: Record<RMAState, number>;
  priority_counts: Record<RMAPriority, number>;
  trends: AdminTrends;
  stale_rmas: StaleRMA[];
  recent_activity: RecentActivity[];
}

// -----------------------------------------------------------------------------
// Auth Context
// -----------------------------------------------------------------------------

/** Shape of the AuthContext value. */
export interface AuthContextValue {
  user: User | null;
  login: () => void;
  register: () => void;
  logout: () => void;
  setUserFromSSO: (userData: User) => void;
  isAdmin: boolean;
  loading: boolean;
}

// -----------------------------------------------------------------------------
// Forms
// -----------------------------------------------------------------------------

/** A single device entry
export interface RMADevice {
  serial_number: string;
  first_ship_date: string;
  fault_notes: string;
}

/** Registration form data. */
export interface RegisterFormData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  password2: string;
}

// -----------------------------------------------------------------------------
// API Filters
// -----------------------------------------------------------------------------

/** Filters used on the Admin RMA Management page. */
export interface RMAFilters {
  state: RMAState | '';
  priority: RMAPriority | '';
}

// -----------------------------------------------------------------------------
// Navigation
// -----------------------------------------------------------------------------

/** Sidebar navigation item. */
export interface NavItem {
  path: string;
  label: string;
  adminOnly?: boolean;
}
