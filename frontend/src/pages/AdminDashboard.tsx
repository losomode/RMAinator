import { useState, useEffect, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { rmaAPI } from '../services/api';
import type { AdminDashboardMetrics } from '../types';

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    loadMetrics();
  }, [isAdmin, navigate]);

  const loadMetrics = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await rmaAPI.getAdminDashboard();
      setMetrics(response.data);
    } catch {
      setError('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <>
        {/* Quick Actions */}
        <div style={styles.quickActions}>
          <h2 style={styles.quickActionsTitle}>Admin Tools</h2>
          <div style={styles.quickActionGrid}>
            <button
              onClick={() => navigate('/admin/rmas')}
              style={styles.quickActionButton}
            >
              📋 Manage RMAs
            </button>
            <button
              onClick={() => navigate('/admin/users')}
              style={styles.quickActionButton}
            >
              👥 User Approvals
            </button>
            <button
              onClick={() => navigate('/admin/config')}
              style={styles.quickActionButton}
            >
              ⚙️ Stale Config
            </button>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {loading ? (
          <div style={styles.loading}>Loading metrics...</div>
        ) : metrics ? (
          <>
            {/* Summary Cards */}
            <div style={styles.summaryGrid}>
              <MetricCard
                title="Total RMAs"
                value={metrics.summary.total_rmas}
                color="#007bff"
              />
              <MetricCard
                title="Active RMAs"
                value={metrics.summary.active_rmas}
                color="#28a745"
              />
              <MetricCard
                title="Archived RMAs"
                value={metrics.summary.archived_rmas}
                color="#6c757d"
              />
              <MetricCard
                title="Stale RMAs"
                value={metrics.summary.stale_rmas_count}
                color="#dc3545"
              />
            </div>

            {/* State Breakdown */}
            <div style={styles.section}>
              <h2>RMAs by State</h2>
              <div style={styles.grid}>
                {Object.entries(metrics.state_counts).map(([state, count]) => (
                  <StateCard key={state} state={state} count={count} />
                ))}
              </div>
            </div>

            {/* Priority Breakdown */}
            <div style={styles.section}>
              <h2>Active RMAs by Priority</h2>
              <div style={styles.priorityGrid}>
                {Object.entries(metrics.priority_counts).map(([priority, count]) => (
                  <div key={priority} style={styles.priorityCard}>
                    <div style={styles.priorityLabel}>{priority}</div>
                    <div style={styles.priorityValue}>{count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trends */}
            <div style={styles.section}>
              <h2>RMA Trends</h2>
              <div style={styles.trendsGrid}>
                <div style={styles.trendCard}>
                  <div style={styles.trendLabel}>Last 7 Days</div>
                  <div style={styles.trendValue}>{metrics.trends.last_7_days}</div>
                </div>
                <div style={styles.trendCard}>
                  <div style={styles.trendLabel}>Last 30 Days</div>
                  <div style={styles.trendValue}>{metrics.trends.last_30_days}</div>
                </div>
                <div style={styles.trendCard}>
                  <div style={styles.trendLabel}>Last 90 Days</div>
                  <div style={styles.trendValue}>{metrics.trends.last_90_days}</div>
                </div>
              </div>
            </div>

            {/* Stale RMAs */}
            {metrics.stale_rmas.length > 0 && (
              <div style={styles.section}>
                <h2>⚠️ Stale RMAs ({'>'}7 days in current state)</h2>
                <div style={styles.table}>
                  {metrics.stale_rmas.map((rma) => (
                    <div
                      key={rma.id}
                      style={styles.tableRow}
                      onClick={() => navigate(`/rma/${rma.id}`)}
                    >
                      <span style={styles.rmaNum}>RMA #{rma.rma_number}</span>
                      <span>{rma.serial_number}</span>
                      <span style={styles.badge}>{rma.state}</span>
                      <span style={{...styles.badge, backgroundColor: '#dc3545'}}>
                        {rma.days_in_state} days
                      </span>
                      <span>{rma.priority}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div style={styles.section}>
              <h2>Recent Activity</h2>
              <div style={styles.activityList}>
                {metrics.recent_activity.map((activity, idx) => (
                  <div key={idx} style={styles.activityItem}>
                    <div style={styles.activityMain}>
                      <span style={styles.rmaNum}>RMA #{activity.rma_number}</span>
                      <span style={styles.activityTransition}>
                        {activity.from_state || 'NEW'} → {activity.to_state}
                      </span>
                    </div>
                    <div style={styles.activityMeta}>
                      <span>{activity.serial_number}</span>
                      <span>by {activity.changed_by}</span>
                      <span>{new Date(activity.changed_at).toLocaleString()}</span>
                    </div>
                    {activity.notes && (
                      <div style={styles.activityNotes}>{activity.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
    </>
  );
};

interface MetricCardProps { title: string; value: number; color: string; }

const MetricCard = ({ title, value, color }: MetricCardProps) => (
  <div style={{...styles.card, borderLeft: `4px solid ${color}`}}>
    <div style={styles.cardTitle}>{title}</div>
    <div style={{...styles.cardValue, color}}>{value}</div>
  </div>
);

interface StateCardProps { state: string; count: number; }

const StateCard = ({ state, count }: StateCardProps) => {
  const colors: Record<string, string> = {
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

  return (
    <div style={styles.stateCard}>
      <div style={{...styles.stateBadge, backgroundColor: colors[state] || '#6c757d'}}>
        {state}
      </div>
      <div style={styles.stateCount}>{count}</div>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  quickActions: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    marginBottom: '30px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  quickActionsTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#333',
  },
  quickActionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
  },
  quickActionButton: {
    padding: '12px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    textAlign: 'center',
  },
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: '20px 40px',
    borderBottom: '1px solid #ddd',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
  },
  userDashBtn: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  username: {
    fontSize: '14px',
    color: '#666',
  },
  logoutBtn: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  content: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  error: {
    backgroundColor: '#fee',
    color: '#c33',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  card: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '8px',
  },
  cardValue: {
    fontSize: '32px',
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '15px',
    marginTop: '16px',
  },
  stateCard: {
    padding: '16px',
    borderRadius: '8px',
    backgroundColor: '#f8f9fa',
    textAlign: 'center',
  },
  stateBadge: {
    padding: '6px 12px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '500',
    marginBottom: '8px',
    display: 'inline-block',
  },
  stateCount: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  },
  priorityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    marginTop: '16px',
  },
  priorityCard: {
    padding: '16px',
    borderRadius: '8px',
    backgroundColor: '#f8f9fa',
    textAlign: 'center',
  },
  priorityLabel: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '8px',
  },
  priorityValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  },
  trendsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    marginTop: '16px',
  },
  trendCard: {
    padding: '16px',
    borderRadius: '8px',
    backgroundColor: '#e3f2fd',
    textAlign: 'center',
  },
  trendLabel: {
    fontSize: '14px',
    color: '#1976d2',
    marginBottom: '8px',
  },
  trendValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#0d47a1',
  },
  table: {
    marginTop: '16px',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '120px 1fr 120px 100px 80px',
    gap: '16px',
    padding: '12px',
    borderBottom: '1px solid #eee',
    cursor: 'pointer',
    alignItems: 'center',
  },
  rmaNum: {
    fontWeight: 'bold',
    color: '#007bff',
  },
  badge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    backgroundColor: '#6c757d',
    color: 'white',
    textAlign: 'center',
  },
  activityList: {
    marginTop: '16px',
  },
  activityItem: {
    padding: '12px',
    borderBottom: '1px solid #eee',
  },
  activityMain: {
    display: 'flex',
    gap: '16px',
    marginBottom: '4px',
  },
  activityTransition: {
    color: '#666',
  },
  activityMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#999',
  },
  activityNotes: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#666',
    fontStyle: 'italic',
  },
};

export default AdminDashboard;
