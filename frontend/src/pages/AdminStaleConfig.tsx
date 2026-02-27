import { useEffect, useState } from 'react';
import { getToken } from '../utils/auth';
import AdminToolsNav from '../components/AdminToolsNav';
import TimeoutPicker from '../components/TimeoutPicker';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8002';

interface StateTimeout {
  id: number;
  state: string;
  state_display: string;
  priority: string;
  priority_display: string;
  timeout_hours: number;
}

const AdminStaleConfig = () => {
  const [configs, setConfigs] = useState<StateTimeout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ [key: number]: number }>({});
  const [creating, setCreating] = useState<{ state: string; priority: string } | null>(null);

  const states = [
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'RECEIVED', label: 'Received' },
    { value: 'DIAGNOSED', label: 'Diagnosed' },
    { value: 'REPAIRED', label: 'Repaired' },
    { value: 'REPLACED', label: 'Replaced' },
    { value: 'SHIPPED', label: 'Shipped' },
  ];

  const priorities = [
    { value: 'LOW', label: 'Low' },
    { value: 'NORMAL', label: 'Normal' },
    { value: 'HIGH', label: 'High' },
  ];

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/rma/admin/stale-config/`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch configurations');
      }

      const data = await response.json();
      setConfigs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: number, currentValue: number) => {
    setEditing(id);
    setEditValues({ ...editValues, [id]: currentValue });
  };

  const handleCancel = () => {
    setEditing(null);
    setEditValues({});
  };

  const handleSave = async (id: number) => {
    const newValue = editValues[id];
    
    if (!newValue || newValue <= 0) {
      alert('Timeout must be greater than 0 hours');
      return;
    }

    try {
      const config = configs.find(c => c.id === id);
      if (!config) return;

      const response = await fetch(`${API_URL}/api/rma/admin/stale-config/${id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeout_hours: newValue,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update configuration');
      }

      await fetchConfigs();
      setEditing(null);
      setEditValues({});
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const handleCreateClick = (state: string, priority: string) => {
    setCreating({ state, priority });
  };

  const handleCreateSave = async (hours: number) => {
    if (!creating) return;

    try {
      const response = await fetch(`${API_URL}/api/rma/admin/stale-config/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          state: creating.state,
          priority: creating.priority,
          timeout_hours: hours,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to create configuration');
      }

      await fetchConfigs();
      setCreating(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/rma/admin/stale-config/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete configuration');
      }

      await fetchConfigs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const getConfigForStatePriority = (state: string, priority: string) => {
    return configs.find(c => c.state === state && c.priority === priority);
  };

  if (loading) {
    return <div className="text-center py-8">Loading configurations...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center py-8">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <AdminToolsNav />
      
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Stale RMA Configuration</h1>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <p className="text-sm text-gray-600">
            Configure timeout thresholds for RMA states. An RMA is marked as stale when it remains 
            in a state longer than the configured timeout for its priority level.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
                {priorities.map(priority => (
                  <th key={priority.value} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {priority.label} Priority (hours)
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {states.map(state => (
                <tr key={state.value}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {state.label}
                  </td>
                  {priorities.map(priority => {
                    const config = getConfigForStatePriority(state.value, priority.value);
                    const formatHours = (hours: number) => {
                      if (hours < 24) return `${hours}h`;
                      if (hours % 168 === 0) return `${hours / 168}w`;
                      if (hours % 24 === 0) return `${hours / 24}d`;
                      return `${hours}h`;
                    };
                    return (
                      <td key={priority.value} className="px-6 py-4 whitespace-nowrap">
                        {config ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-900 font-medium">{formatHours(config.timeout_hours)}</span>
                            <button
                              onClick={() => handleEdit(config.id, config.timeout_hours)}
                              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(config.id)}
                              className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCreateClick(state.value, priority.value)}
                            className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200"
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Each RMA state can have different timeout thresholds based on priority level</li>
          <li>The system checks for stale RMAs periodically (via cron job)</li>
          <li>When an RMA exceeds its configured timeout, admins receive a notification</li>
          <li>Higher priority RMAs typically have shorter timeouts</li>
        </ul>
      </div>

      {/* Modal overlay for editing */}
      {editing !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <TimeoutPicker
            initialHours={editValues[editing] ?? configs.find(c => c.id === editing)?.timeout_hours ?? 24}
            onSave={(hours) => {
              setEditValues({ ...editValues, [editing]: hours });
              handleSave(editing);
            }}
            onCancel={handleCancel}
          />
        </div>
      )}

      {/* Modal overlay for creating */}
      {creating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <TimeoutPicker
            initialHours={24}
            onSave={handleCreateSave}
            onCancel={() => setCreating(null)}
          />
        </div>
      )}
    </div>
  );
};

export default AdminStaleConfig;
