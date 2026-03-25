import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { rmaApi } from '../api';
import { STATE_COLORS, STATE_LABELS } from '../types';
import type { RMA } from '../types';
import { useAuth } from '@inator/shared/auth/AuthProvider';
import { companiesApi, type Company } from '@inator/shared/api/companies';


type ViewMode = 'all' | 'byGroup';

/** User-facing RMA dashboard — shows all owned RMAs with optional group view. */
export function Dashboard(): React.JSX.Element {
  const { isAdmin } = useAuth();
  const [rmas, setRmas] = useState<RMA[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  type DashboardFilter = 'all' | 'active' | 'completed';
  const [filter, setFilter] = useState<DashboardFilter>('all');
  const [companyFilter, setCompanyFilter] = useState<number | ''>('');
  const [viewMode, setViewMode] = useState<ViewMode>('byGroup');

  const navigate = useNavigate();

  useEffect(() => {
    if (isAdmin) {
      void loadCompanies();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadRMAs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, companyFilter]);

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
      // No archived param when filter=all → backend returns everything
      const params: Record<string, unknown> = {};
      if (filter === 'active') params.archived = false;
      else if (filter === 'completed') params.archived = true;
      if (companyFilter) params.company = companyFilter;
      const data = await rmaApi.list(params);
      setRmas(data);
    } catch {
      setError('Failed to load RMAs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900">My RMAs</h2>
        <div className="flex flex-wrap gap-3">
          {isAdmin && companies.length > 0 && (
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value ? parseInt(e.target.value) : '')}
              className="rounded-md border border-gray-300 bg-white px-5 py-2 text-sm text-gray-700"
            >
              <option value="">All Companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          )}
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md border px-5 py-2 text-sm font-medium transition-colors ${
                filter === f
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'All' : f === 'active' ? 'Active Only' : 'Completed Only'}
            </button>
          ))}
          <button
            onClick={() => navigate('/new')}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New RMA
          </button>
        </div>
      </div>

      {/* View mode toggle */}
      <div className="mb-8 flex flex-wrap items-center gap-4 rounded-lg bg-white p-5 shadow-sm">
        <span className="text-sm font-semibold text-gray-900">View:</span>
        <div className="flex gap-3">
          {(['all', 'byGroup'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                viewMode === mode
                  ? 'border-blue-600 bg-blue-600 font-medium text-white'
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {mode === 'all' ? 'All RMAs' : 'By RMA Group'}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mb-5 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="py-10 text-center text-gray-500">Loading...</div>
      ) : rmas.length === 0 ? (
        <div className="rounded-lg bg-white p-16 text-center shadow-sm">
          <p className="text-gray-500">No RMAs found</p>
          {filter !== 'completed' && (
            <button
              onClick={() => navigate('/new')}
              className="mt-4 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create your first RMA
            </button>
          )}
        </div>
      ) : (
        <RMAView rmas={rmas} viewMode={viewMode} />
      )}
    </>
  );
}

function RMAView({ rmas, viewMode }: { rmas: RMA[]; viewMode: ViewMode }): React.JSX.Element {
  const navigate = useNavigate();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string): void => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: prev[groupId] === false }));
  };

  if (viewMode === 'byGroup') {
    const grouped: Record<number, RMA[]> = {};
    const ungrouped: RMA[] = [];

    rmas.forEach((rma) => {
      if (rma.group_id) {
        if (!grouped[rma.group_id]) grouped[rma.group_id] = [];
        grouped[rma.group_id]!.push(rma);
      } else {
        ungrouped.push(rma);
      }
    });

    // Sort groups newest-first by the most recent RMA's created_at.
    // (Object.entries on numeric keys would sort ascending by key, so we sort explicitly.)
    const sortedGroups = Object.entries(grouped).sort(([, aRmas], [, bRmas]) => {
      const aTime = new Date(aRmas[0]?.created_at ?? 0).getTime();
      const bTime = new Date(bRmas[0]?.created_at ?? 0).getTime();
      return bTime - aTime;
    });

    // Bucket into years (newest first)
    const groupsByYear: Record<number, Array<[string, RMA[]]>> = {};
    for (const entry of sortedGroups) {
    const year = new Date(entry[1][0]?.group_created_at ?? entry[1][0]?.created_at ?? 0).getFullYear();
      if (!groupsByYear[year]) groupsByYear[year] = [];
      groupsByYear[year].push(entry);
    }
    const years = Object.keys(groupsByYear).map(Number).sort((a, b) => b - a);

    return (
      <div>
        {years.map((year) => (
          <div key={year} className="mb-10 flex gap-0">
            {/* Sticky year indicator on the left */}
            <div className="w-10 flex-shrink-0">
              <div className="sticky top-4 flex justify-center">
                <span
                  className="select-none rounded-md bg-blue-600 px-2 py-4 text-xs font-bold tracking-widest text-white shadow-sm"
                  style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
                >
                  {year}
                </span>
              </div>
            </div>

            {/* Groups for this year */}
            <div className="flex-1 pl-3">
              {groupsByYear[year]!.map(([groupId, groupRmas]) => {
                const isExpanded = expandedGroups[groupId] !== false;
                const company = groupRmas[0]?.company_name;
                return (
                  <div key={`group-${groupId}`} className="mb-8">
                    <div className="mb-5 flex items-center gap-3 rounded-lg border-l-4 border-blue-600 bg-gray-50 p-5">
                      <button
                        onClick={() => toggleGroup(groupId)}
                        className="rounded border border-gray-300 px-3 py-1 text-sm font-bold text-blue-600"
                        aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                      <button
                        onClick={() => navigate(`/group/${groupId}`)}
                        className="text-left"
                      >
                        <h3 className="text-lg font-semibold text-blue-700 hover:underline">
                          📦 {groupRmas[0]?.group_name ?? `Group #${groupId}`}
                          <span className="ml-2 text-sm font-normal text-gray-500">
                            ({groupRmas.length} device{groupRmas.length !== 1 ? 's' : ''})
                          </span>
                        </h3>
                      </button>
                      {company && (
                        <span className="rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                          🏢 {company}
                        </span>
                      )}
                    </div>
                    {isExpanded && <RMAGrid rmas={groupRmas} />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {ungrouped.length > 0 && (
          <div className="mb-6 flex gap-0">
            <div className="w-10 flex-shrink-0" />
            <div className="flex-1 pl-3">
              <h3 className="mb-5 text-lg font-semibold text-gray-900">Individual RMAs</h3>
              <RMAGrid rmas={ungrouped} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return <RMAGrid rmas={rmas} />;
}

function RMAGrid({ rmas }: { rmas: RMA[] }): React.JSX.Element {
  return (
    <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(280px,1fr))] items-start gap-6">
      {rmas.map((rma) => (
        <RMACard key={rma.id} rma={rma} />
      ))}
    </div>
  );
}

function RMACard({ rma }: { rma: RMA }): React.JSX.Element {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  return (
    <div
      onClick={() => navigate(`/${String(rma.id)}`)}
      className="cursor-pointer rounded-lg bg-white p-5 shadow transition-shadow hover:shadow-lg"
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/${String(rma.id)}`);
      }}
    >
      <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3">
        <span className="text-base font-bold text-gray-900">RMA #{rma.rma_number}</span>
        <span
          className="rounded-full px-3 py-1 text-xs font-medium text-white"
          style={{ backgroundColor: STATE_COLORS[rma.state] }}
        >
          {STATE_LABELS[rma.state]}
        </span>
      </div>
      <div className="flex flex-col gap-2 text-sm text-gray-600">
        {rma.group_id && (
          <span className="inline-block w-fit rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
            📦 {rma.group_name ?? `Group #${String(rma.group_id)}`}
          </span>
        )}
        {isAdmin && rma.company_name && (
          <span className="inline-block w-fit rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
            🏢 {rma.company_name}
          </span>
        )}
        <div>
          <strong>Serial:</strong> {rma.serial_number}
        </div>
        <div>
          <strong>Priority:</strong> {rma.priority}
        </div>
        <div>
          <strong>Created:</strong> {new Date(rma.created_at).toLocaleDateString()}
        </div>
        {rma.is_archived && (
          <div>
            <strong>{rma.state === 'COMPLETED' ? 'Completed:' : 'Closed:'}</strong>{' '}
            {new Date(rma.updated_at).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
