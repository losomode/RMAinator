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
  company_id: number | null;
  company_name: string | null;
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

/** A single device entry in the create-RMA form. */
export interface RMADevice {
  serial_number: string;
  first_ship_date: string;
  fault_notes: string;
}

/** Filters used on the Admin RMA Management page. */
export interface RMAFilters {
  state: RMAState | '';
  priority: RMAPriority | '';
  company: number | '';
}

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

/** Stale-config timeout entry from the admin endpoint. */
export interface StateTimeout {
  id: number;
  state: string;
  state_display: string;
  priority: string;
  priority_display: string;
  timeout_hours: number;
}

/** Colour map for RMA state badges. */
export const STATE_COLORS: Record<RMAState, string> = {
  SUBMITTED: '#ffa500',
  APPROVED: '#28a745',
  REJECTED: '#dc3545',
  RECEIVED: '#17a2b8',
  DIAGNOSED: '#6c757d',
  REPAIRED: '#007bff',
  REPLACED: '#007bff',
  SHIPPED: '#28a745',
  COMPLETED: '#6c757d',
};

/** Colour map for RMA priority badges. */
export const PRIORITY_COLORS: Record<RMAPriority, string> = {
  LOW: '#28a745',
  NORMAL: '#007bff',
  HIGH: '#dc3545',
};
