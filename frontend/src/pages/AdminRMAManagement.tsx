import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { rmaApi } from '../api';
import { STATE_COLORS, PRIORITY_COLORS } from '../types';
import type { RMA, RMAState, RMAPriority, RMAFilters } from '../types';
import { AdminToolsNav } from '../components/AdminToolsNav';
import { companiesApi, type Company } from '@inator/shared/api/companies';

const STATES: RMAState[] = [
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'RECEIVED',
  'DIAGNOSED',
  'REPAIRED',
  'REPLACED',
  'SHIPPED',
  'COMPLETED',
];

const PRIORITIES: RMAPriority[] = ['LOW', 'NORMAL', 'HIGH'];

/** Admin page to search, filter, and manage all RMAs. */
export function AdminRMAManagement(): React.JSX.Element {
  const [rmas, setRmas] = useState<RMA[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<RMAFilters>({ state: '', priority: '', company: '' });

  const navigate = useNavigate();

  useEffect(() => {
    void loadRMAs();
    void loadCompanies();
  }, []);

  const loadCompanies = async (): Promise<void> => {
    try {
      const data = await companiesApi.list();
      setCompanies(data);
    } catch {
      // Non-critical, just won't have company filter
    }
  };

  const loadRMAs = async (): Promise<void> => {
    try {
      setLoading(true);
      setError('');
      const params: Record<string, unknown> = { archived: false };
      if (filters.company) params.company = filters.company;
      const data = await rmaApi.list(params);
      setRmas(data);
    } catch {
      setError('Failed to load RMAs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (): Promise<void> => {
    try {
      setLoading(true);
      setError('');
      const params: Record<string, string | number> = {};
      if (searchQuery) params.q = searchQuery;
      if (filters.state) params.state = filters.state;
      if (filters.priority) params.priority = filters.priority;
      if (filters.company) params.company = filters.company;
      const data = await rmaApi.search(params);
      setRmas(data);
    } catch {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = (): void => {
    setSearchQuery('');
    setFilters({ state: '', priority: '', company: '' });
    void loadRMAs();
  };

  return (
    <>
      <AdminToolsNav />

      <h1 className="mb-6 text-2xl font-bold text-gray-900">RMA Management</h1>

      {/* Search and Filters */}
      <div className="mb-5 rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex gap-3">
          <input
            type="text"
            placeholder="Search by RMA #, Serial #, Owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSearch();
            }}
            className="flex-1 rounded-md border border-gray-300 px-3 py-3 text-sm"
          />
          <button
            onClick={() => void handleSearch()}
            className="rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            Search
          </button>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filters.state}
            onChange={(e) => setFilters({ ...filters, state: e.target.value as RMAState | '' })}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All States</option>
            {STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>

          <select
            value={filters.priority}
            onChange={(e) =>
              setFilters({ ...filters, priority: e.target.value as RMAPriority | '' })
            }
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>

          <select
            value={filters.company}
            onChange={(e) =>
              setFilters({ ...filters, company: e.target.value ? parseInt(e.target.value) : '' })
            }
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All Companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleClearFilters}
            className="rounded-md bg-gray-500 px-4 py-2 text-sm text-white hover:bg-gray-600"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {error && <div className="mb-5 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* RMA Table */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-5 text-lg font-semibold text-gray-900">All RMAs ({rmas.length})</h2>

        {loading ? (
          <div className="py-10 text-center text-gray-500">Loading...</div>
        ) : rmas.length === 0 ? (
          <div className="py-10 text-center text-gray-500">No RMAs found</div>
        ) : (
          <div className="flex flex-col">
            {/* Header */}
            <div className="mb-2 grid grid-cols-[80px_150px_120px_120px_100px_120px_100px] gap-4 rounded bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900">
              <div>RMA #</div>
              <div>Serial Number</div>
              <div>Owner</div>
              <div>State</div>
              <div>Priority</div>
              <div>Created</div>
              <div>Actions</div>
            </div>

            {/* Rows */}
            {rmas.map((rma) => (
              <div
                key={rma.id}
                className="grid grid-cols-[80px_150px_120px_120px_100px_120px_100px] items-center gap-4 border-b border-gray-100 px-4 py-3 text-sm"
              >
                <div className="font-bold text-blue-600">#{rma.rma_number}</div>
                <div>{rma.serial_number}</div>
                <div>{rma.owner?.username ?? 'N/A'}</div>
                <div>
                  <span
                    className="inline-block rounded px-2 py-1 text-xs text-white"
                    style={{ backgroundColor: STATE_COLORS[rma.state] }}
                  >
                    {rma.state}
                  </span>
                </div>
                <div>
                  <span
                    className="inline-block rounded px-2 py-1 text-xs text-white"
                    style={{ backgroundColor: PRIORITY_COLORS[rma.priority] }}
                  >
                    {rma.priority}
                  </span>
                </div>
                <div>{new Date(rma.created_at).toLocaleDateString()}</div>
                <div>
                  <button
                    onClick={() => navigate(`/${String(rma.id)}`)}
                    className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
