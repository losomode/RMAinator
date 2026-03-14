import { useEffect, useState } from 'react';
import { staleConfigApi } from '../api';
import { AdminToolsNav } from '../components/AdminToolsNav';
import { TimeoutPicker, formatHours } from '../components/TimeoutPicker';
import type { StateTimeout } from '../types';

const STATES = [
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'RECEIVED', label: 'Received' },
  { value: 'DIAGNOSED', label: 'Diagnosed' },
  { value: 'REPAIRED', label: 'Repaired' },
  { value: 'REPLACED', label: 'Replaced' },
  { value: 'SHIPPED', label: 'Shipped' },
] as const;

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
] as const;

/** Admin page to configure per-state, per-priority stale-RMA timeout thresholds. */
export function AdminStaleConfig(): React.JSX.Element {
  const [configs, setConfigs] = useState<StateTimeout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [creating, setCreating] = useState<{ state: string; priority: string } | null>(null);

  useEffect(() => {
    void fetchConfigs();
  }, []);

  const fetchConfigs = async (): Promise<void> => {
    try {
      const data = await staleConfigApi.list();
      setConfigs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id: number, hours: number): Promise<void> => {
    try {
      await staleConfigApi.update(id, hours);
      await fetchConfigs();
      setEditing(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleCreate = async (hours: number): Promise<void> => {
    if (!creating) return;
    try {
      await staleConfigApi.create(creating.state, creating.priority, hours);
      await fetchConfigs();
      setCreating(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create');
    }
  };

  const handleDelete = async (id: number): Promise<void> => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;
    try {
      await staleConfigApi.delete(id);
      await fetchConfigs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const getConfig = (state: string, priority: string): StateTimeout | undefined =>
    configs.find((c) => c.state === state && c.priority === priority);

  if (loading) {
    return <div className="py-10 text-center text-gray-500">Loading configurations...</div>;
  }

  if (error) {
    return <div className="py-10 text-center text-red-600">Error: {error}</div>;
  }

  return (
    <>
      <AdminToolsNav />

      <h1 className="mb-6 text-2xl font-bold text-gray-900">Stale RMA Configuration</h1>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="border-b bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            Configure timeout thresholds for RMA states. An RMA is marked as stale when it remains
            in a state longer than the configured timeout for its priority level.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  State
                </th>
                {PRIORITIES.map((p) => (
                  <th
                    key={p.value}
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    {p.label} Priority (hours)
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {STATES.map((state) => (
                <tr key={state.value}>
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                    {state.label}
                  </td>
                  {PRIORITIES.map((priority) => {
                    const config = getConfig(state.value, priority.value);
                    return (
                      <td key={priority.value} className="whitespace-nowrap px-6 py-4">
                        {config ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {formatHours(config.timeout_hours)}
                            </span>
                            <button
                              onClick={() => setEditing(config.id)}
                              className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => void handleDelete(config.id)}
                              className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              setCreating({ state: state.value, priority: priority.value })
                            }
                            className="rounded bg-green-100 px-3 py-1 text-xs text-green-700 hover:bg-green-200"
                          >
                            Add Config
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="mb-2 font-semibold text-blue-900">How it works:</h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-blue-800">
          <li>Each RMA state can have different timeout thresholds based on priority level</li>
          <li>The system checks for stale RMAs periodically (via cron job)</li>
          <li>When an RMA exceeds its configured timeout, admins receive a notification</li>
          <li>Higher priority RMAs typically have shorter timeouts</li>
        </ul>
      </div>

      {/* Edit modal */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <TimeoutPicker
            initialHours={configs.find((c) => c.id === editing)?.timeout_hours ?? 24}
            onSave={(hours) => void handleSave(editing, hours)}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <TimeoutPicker
            initialHours={24}
            onSave={(hours) => void handleCreate(hours)}
            onCancel={() => setCreating(null)}
          />
        </div>
      )}
    </>
  );
}
