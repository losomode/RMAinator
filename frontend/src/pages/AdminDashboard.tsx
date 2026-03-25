import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { rmaApi } from '../api';
import { STATE_COLORS, STATE_LABELS } from '../types';
import type { AdminDashboardMetrics, RMAState } from '../types';
import { AdminToolsNav } from '../components/AdminToolsNav';

/** Admin dashboard with summary metrics, trends, stale RMAs, and recent activity. */
export function AdminDashboard(): React.JSX.Element {
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    void loadMetrics();
  }, []);

  const loadMetrics = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await rmaApi.getAdminDashboard();
      setMetrics(data);
    } catch {
      setError('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AdminToolsNav />

      {error && <div className="mb-5 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="py-10 text-center text-gray-500">Loading metrics...</div>
      ) : metrics ? (
        <>
          {/* Summary Cards */}
          <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Total RMAs" value={metrics.summary.total_rmas} color="#007bff" />
            <MetricCard title="Active RMAs" value={metrics.summary.active_rmas} color="#28a745" />
            <MetricCard
              title="Finished RMAs"
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
          <Section title="RMAs by State">
            <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
              {Object.entries(metrics.state_counts).map(([state, count]) => (
                <div key={state} className="rounded-lg bg-gray-50 p-4 text-center">
                  <span
                    className="mb-2 inline-block rounded-full px-3 py-1 text-xs font-medium text-white"
                    style={{
                      backgroundColor:
                        STATE_COLORS[state as keyof typeof STATE_COLORS] ?? '#6c757d',
                    }}
                  >
                    {STATE_LABELS[state as RMAState] ?? state}
                  </span>
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* Priority Breakdown */}
          <Section title="Active RMAs by Priority">
            <div className="mt-4 grid grid-cols-3 gap-4">
              {Object.entries(metrics.priority_counts).map(([priority, count]) => (
                <div key={priority} className="rounded-lg bg-gray-50 p-4 text-center">
                  <div className="mb-2 text-sm text-gray-500">{priority}</div>
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* Trends */}
          <Section title="RMA Trends">
            <div className="mt-4 grid grid-cols-3 gap-4">
              {[
                { label: 'Last 7 Days', value: metrics.trends.last_7_days },
                { label: 'Last 30 Days', value: metrics.trends.last_30_days },
                { label: 'Last 90 Days', value: metrics.trends.last_90_days },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-blue-50 p-4 text-center">
                  <div className="mb-2 text-sm text-blue-700">{label}</div>
                  <div className="text-2xl font-bold text-blue-900">{value}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* Stale RMAs */}
          {metrics.stale_rmas.length > 0 && (
            <Section title={`⚠️ Stale RMAs (>7 days in current state)`}>
              <div className="mt-4">
                {metrics.stale_rmas.map((rma) => (
                  <div
                    key={rma.id}
                    className="grid cursor-pointer grid-cols-[120px_1fr_120px_100px_80px] items-center gap-4 border-b border-gray-100 p-3"
                    onClick={() => navigate(`/${String(rma.id)}`)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigate(`/${String(rma.id)}`);
                    }}
                  >
                    <span className="font-bold text-blue-600">RMA #{rma.rma_number}</span>
                    <span>{rma.serial_number}</span>
                    <span className="rounded px-2 py-1 text-center text-xs text-white"
                      style={{ backgroundColor: STATE_COLORS[rma.state] ?? '#6c757d' }}
                    >
                      {STATE_LABELS[rma.state] ?? rma.state}
                    </span>
                    <span className="rounded bg-red-500 px-2 py-1 text-center text-xs text-white">
                      {rma.days_in_state} days
                    </span>
                    <span>{rma.priority}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Recent Activity */}
          <Section title="Recent Activity">
            <div className="mt-4">
              {metrics.recent_activity.map((activity, idx) => (
                <div key={idx} className="border-b border-gray-100 p-3">
                  <div className="mb-1 flex gap-4">
                    <span className="font-bold text-blue-600">RMA #{activity.rma_number}</span>
                    <span className="text-gray-500">
                      {activity.from_state ? (STATE_LABELS[activity.from_state] ?? activity.from_state) : 'New'}
                      {' → '}
                      {STATE_LABELS[activity.to_state] ?? activity.to_state}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>{activity.serial_number}</span>
                    <span>by {activity.changed_by}</span>
                    <span>{new Date(activity.changed_at).toLocaleString()}</span>
                  </div>
                  {activity.notes && (
                    <div className="mt-2 text-xs italic text-gray-500">{activity.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </>
      ) : null}
    </>
  );
}

function MetricCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}): React.JSX.Element {
  return (
    <div className="rounded-lg bg-white p-6 shadow" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="mb-2 text-sm text-gray-500">{title}</div>
      <div className="text-3xl font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="mb-5 rounded-lg bg-white p-6 shadow">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}
