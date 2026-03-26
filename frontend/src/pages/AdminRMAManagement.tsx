import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { rmaApi } from '../api';
import { STATE_COLORS, STATE_LABELS, PRIORITY_COLORS } from '../types';
import type { RMA, RMAState, RMAPriority, RMAFilters } from '../types';
import { AdminToolsNav } from '../components/AdminToolsNav';
import { companiesApi, type Company } from '@inator/shared/api/companies';
import { getApiErrorMessage } from '@inator/shared/types';

const STATES: RMAState[] = [
  'SUBMITTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'DIAGNOSED',
  'REPAIRED', 'REPLACED', 'IN_QA', 'READY_FOR_RETURN', 'SHIPPED', 'COMPLETED',
];
const PRIORITIES: RMAPriority[] = ['LOW', 'NORMAL', 'HIGH'];
type ViewMode = 'byGroup' | 'flatList';

/** Admin page to search, filter, and manage all RMA groups and devices. */
export function AdminRMAManagement(): React.JSX.Element {
  const [rmas, setRmas] = useState<RMA[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('byGroup');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<RMAFilters>({ state: '', priority: '', company: '' });

  const [editDateGroup, setEditDateGroup] = useState<{ id: number; name: string; date: string } | null>(null);
  const [moveDeviceRma, setMoveDeviceRma] = useState<RMA | null>(null);
  const [moveTargetGroupId, setMoveTargetGroupId] = useState<string>('');
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<{ id: number; name: string; count: number } | null>(null);
  const [deleteRmaTarget, setDeleteRmaTarget] = useState<{ id: number; num: string; sn: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const navigate = useNavigate();

  useEffect(() => { void loadAll(); void loadCompanies(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCompanies = async (): Promise<void> => {
    try { setCompanies(await companiesApi.list()); } catch { /* non-critical */ }
  };

  const loadAll = async (): Promise<void> => {
    try {
      setLoading(true); setError('');
      setRmas(await rmaApi.list({})); // no archived filter → all RMAs
    } catch { setError('Failed to load RMAs'); } finally { setLoading(false); }
  };

  const handleSearch = async (): Promise<void> => {
    try {
      setLoading(true); setError('');
      const params: Record<string, string | number> = {};
      if (searchQuery) params.q = searchQuery;
      if (filters.state) params.state = filters.state;
      if (filters.priority) params.priority = filters.priority;
      if (filters.company) params.company = filters.company;
      setRmas(await rmaApi.search(params));
    } catch { setError('Search failed'); } finally { setLoading(false); }
  };

  const allGroups = Object.values(
    rmas.reduce<Record<number, { id: number; name: string | null }>>((acc, rma) => {
      if (rma.group_id && !acc[rma.group_id]) acc[rma.group_id] = { id: rma.group_id, name: rma.group_name };
      return acc;
    }, {})
  ).sort((a, b) => a.id - b.id);

  const handleSaveDate = async (): Promise<void> => {
    if (!editDateGroup) return;
    setActionLoading(true); setActionError('');
    try {
      await rmaApi.updateGroup(editDateGroup.id, { created_at: editDateGroup.date });

      // After saving group date, prompt to also backdate all devices
      const dateLabel = new Date(editDateGroup.date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
      if (window.confirm(
        `Also change the creation date of all tickets in "${editDateGroup.name}" to ${dateLabel}?`
      )) {
        await rmaApi.updateGroup(editDateGroup.id, { also_update_rmas: true });
      }

      setEditDateGroup(null);
      void loadAll();
    } catch (e) { setActionError(getApiErrorMessage(e, 'Failed to update date')); }
    finally { setActionLoading(false); }
  };

  const handleMoveDevice = async (): Promise<void> => {
    if (!moveDeviceRma || moveTargetGroupId === '') return;
    setActionLoading(true); setActionError('');
    try {
      const groupId = moveTargetGroupId === 'null' ? null : parseInt(moveTargetGroupId);
      await rmaApi.update(moveDeviceRma.id, { group_id: groupId } as never);
      setMoveDeviceRma(null); setMoveTargetGroupId(''); void loadAll();
    } catch (e) { setActionError(getApiErrorMessage(e, 'Failed to move device')); }
    finally { setActionLoading(false); }
  };

  const handleDeleteGroup = async (): Promise<void> => {
    if (!deleteGroupTarget) return;
    setActionLoading(true); setActionError('');
    try {
      await rmaApi.deleteGroup(deleteGroupTarget.id);
      setDeleteGroupTarget(null); void loadAll();
    } catch (e) { setActionError(getApiErrorMessage(e, 'Failed to delete group')); }
    finally { setActionLoading(false); }
  };

  const handleDeleteRma = async (): Promise<void> => {
    if (!deleteRmaTarget) return;
    setActionLoading(true); setActionError('');
    try {
      await rmaApi.delete(deleteRmaTarget.id);
      setDeleteRmaTarget(null); void loadAll();
    } catch (e) { setActionError(getApiErrorMessage(e, 'Failed to delete device')); }
    finally { setActionLoading(false); }
  };

  return (
    <>
      <AdminToolsNav />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">RMA Management</h1>
        <div className="flex gap-2">
          {(['byGroup', 'flatList'] as ViewMode[]).map((m) => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === m ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {m === 'byGroup' ? '📦 All RMA Groups' : '📋 Flat List'}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'flatList' && (
        <div className="mb-5 rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex gap-3">
            <input type="text" placeholder="Search by RMA #, Serial #, Owner…" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSearch(); }}
              className="flex-1 rounded-md border border-gray-300 px-3 py-3 text-sm"
            />
            <button onClick={() => void handleSearch()} className="rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700">Search</button>
          </div>
          <div className="flex flex-wrap gap-3">
            <select value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value as RMAState | '' })} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="">All States</option>
              {STATES.map((s) => <option key={s} value={s}>{STATE_LABELS[s]}</option>)}
            </select>
            <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value as RMAPriority | '' })} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="">All Priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={filters.company} onChange={(e) => setFilters({ ...filters, company: e.target.value ? parseInt(e.target.value) : '' })} className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
              <option value="">All Companies</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={() => { setSearchQuery(''); setFilters({ state: '', priority: '', company: '' }); void loadAll(); }} className="rounded-md bg-gray-500 px-4 py-2 text-sm text-white hover:bg-gray-600">Clear</button>
          </div>
        </div>
      )}

      {error && <div className="mb-5 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="py-10 text-center text-gray-500">Loading…</div>
      ) : viewMode === 'byGroup' ? (
        <GroupsView
          rmas={rmas}
          onNavigate={(id) => navigate(`/${String(id)}`)}
          onEditDate={(gId, name, date) => { setActionError(''); setEditDateGroup({ id: gId, name, date }); }}
          onDeleteGroup={(gId, name, count) => { setActionError(''); setDeleteGroupTarget({ id: gId, name, count }); }}
          onMoveDevice={(rma) => { setActionError(''); setMoveTargetGroupId(''); setMoveDeviceRma(rma); }}
          onDeleteDevice={(rma) => { setActionError(''); setDeleteRmaTarget({ id: rma.id, num: rma.rma_number, sn: rma.serial_number }); }}
        />
      ) : (
        <FlatListView rmas={rmas} onNavigate={(id) => navigate(`/${String(id)}`)} />
      )}

      {/* Edit Date Modal */}
      {editDateGroup && (
        <Modal title="Edit Group Date" onClose={() => setEditDateGroup(null)}>
          <p className="mb-4 text-sm text-gray-600">
            Date for <strong>{editDateGroup.name}</strong>. Controls which year this group appears under on the dashboard.
          </p>
          <label className="mb-1 block text-sm font-semibold text-gray-600">Date</label>
          <input type="date" value={editDateGroup.date.slice(0, 10)}
            onChange={(e) => setEditDateGroup({ ...editDateGroup, date: e.target.value })}
            className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}
          <ModalFooter onCancel={() => setEditDateGroup(null)} onConfirm={() => void handleSaveDate()} label="Save Date" loading={actionLoading} />
        </Modal>
      )}

      {/* Move Device Modal */}
      {moveDeviceRma && (
        <Modal title="Move Device to Different Group" onClose={() => setMoveDeviceRma(null)}>
          <p className="mb-4 text-sm text-gray-600">
            Moving <strong>RMA #{moveDeviceRma.rma_number}</strong> ({moveDeviceRma.serial_number}).
          </p>
          <label className="mb-1 block text-sm font-semibold text-gray-600">Target Group</label>
          <select value={moveTargetGroupId} onChange={(e) => setMoveTargetGroupId(e.target.value)}
            className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">— Select a group —</option>
            {allGroups.filter((g) => g.id !== moveDeviceRma.group_id).map((g) => (
              <option key={g.id} value={g.id}>{g.name ?? `Group #${g.id}`}</option>
            ))}
          </select>
          {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}
          <ModalFooter onCancel={() => setMoveDeviceRma(null)} onConfirm={() => void handleMoveDevice()} label="Move Device" loading={actionLoading} disabled={moveTargetGroupId === ''} />
        </Modal>
      )}

      {/* Delete Group Modal */}
      {deleteGroupTarget && (
        <Modal title="⚠️ Delete Group Permanently" onClose={() => setDeleteGroupTarget(null)}>
          <div className="mb-4 rounded-md border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-800">
            <strong>This cannot be undone.</strong> This will permanently delete{' '}
            <strong>{deleteGroupTarget.name}</strong> and all {deleteGroupTarget.count} device{deleteGroupTarget.count !== 1 ? 's' : ''} in it.
            <br /><br />
            To keep any devices, <strong>move them to another group first</strong>.
          </div>
          {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}
          <ModalFooter onCancel={() => setDeleteGroupTarget(null)} onConfirm={() => void handleDeleteGroup()} label="Delete Permanently" loading={actionLoading} danger />
        </Modal>
      )}

      {/* Delete Device Modal */}
      {deleteRmaTarget && (
        <Modal title="⚠️ Delete Device Permanently" onClose={() => setDeleteRmaTarget(null)}>
          <div className="mb-4 rounded-md border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-800">
            <strong>This cannot be undone.</strong> Delete <strong>RMA #{deleteRmaTarget.num}</strong> (SN: {deleteRmaTarget.sn})?
          </div>
          {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}
          <ModalFooter onCancel={() => setDeleteRmaTarget(null)} onConfirm={() => void handleDeleteRma()} label="Delete Permanently" loading={actionLoading} danger />
        </Modal>
      )}
    </>
  );
}

// ── By-Group View ────────────────────────────────────────────────────────

function GroupsView({ rmas, onNavigate, onEditDate, onDeleteGroup, onMoveDevice, onDeleteDevice }: {
  rmas: RMA[];
  onNavigate: (id: number) => void;
  onEditDate: (groupId: number, name: string, date: string) => void;
  onDeleteGroup: (groupId: number, name: string, count: number) => void;
  onMoveDevice: (rma: RMA) => void;
  onDeleteDevice: (rma: RMA) => void;
}): React.JSX.Element {
  const grouped: Record<number, RMA[]> = {};
  const ungrouped: RMA[] = [];
  rmas.forEach((rma) => {
    if (rma.group_id) { if (!grouped[rma.group_id]) grouped[rma.group_id] = []; grouped[rma.group_id]!.push(rma); }
    else ungrouped.push(rma);
  });

  const sortedGroups = Object.entries(grouped).sort(([, a], [, b]) =>
    new Date(b[0]?.group_created_at ?? b[0]?.created_at ?? 0).getTime() -
    new Date(a[0]?.group_created_at ?? a[0]?.created_at ?? 0).getTime()
  );

  if (sortedGroups.length === 0 && ungrouped.length === 0)
    return <div className="py-10 text-center text-gray-500">No RMA groups found</div>;

  return (
    <div>
      {sortedGroups.map(([gId, groupRmas]) => (
        <GroupRow key={gId} groupId={parseInt(gId)} rmas={groupRmas} onNavigate={onNavigate}
          onEditDate={onEditDate} onDeleteGroup={onDeleteGroup} onMoveDevice={onMoveDevice} onDeleteDevice={onDeleteDevice} />
      ))}
      {ungrouped.length > 0 && (
        <div className="mb-4 rounded-lg bg-white shadow">
          <div className="border-b border-gray-100 p-4">
            <span className="font-bold text-gray-500 text-sm uppercase tracking-wide">Standalone Devices ({ungrouped.length})</span>
          </div>
          <div className="divide-y divide-gray-50 px-4">
            {ungrouped.map((rma) => <DeviceRow key={rma.id} rma={rma} onNavigate={onNavigate} onMoveDevice={onMoveDevice} onDeleteDevice={onDeleteDevice} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function GroupRow({ groupId, rmas, onNavigate, onEditDate, onDeleteGroup, onMoveDevice, onDeleteDevice }: {
  groupId: number; rmas: RMA[];
  onNavigate: (id: number) => void;
  onEditDate: (groupId: number, name: string, date: string) => void;
  onDeleteGroup: (groupId: number, name: string, count: number) => void;
  onMoveDevice: (rma: RMA) => void;
  onDeleteDevice: (rma: RMA) => void;
}): React.JSX.Element {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const name = rmas[0]?.group_name ?? `Group #${groupId}`;
  const date = rmas[0]?.group_created_at ?? rmas[0]?.created_at ?? '';
  const company = rmas[0]?.company_name;

  return (
    <div className="mb-3 rounded-lg bg-white shadow">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
        <button onClick={() => setExpanded((v) => !v)} className="text-sm font-bold text-blue-600 px-1">
          {expanded ? '▼' : '▶'}
        </button>
        <div className="flex-1 min-w-0">
          <span className="font-bold text-gray-900">📦 {name}</span>
          {company && <span className="ml-2 rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">🏢 {company}</span>}
          <span className="ml-2 text-xs text-gray-400">
            {new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          </span>
          <span className="ml-1 text-xs text-gray-400">· {rmas.length} device{rmas.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => navigate(`/group/${groupId}`)} className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700">View</button>
          <button onClick={() => onEditDate(groupId, name, date)} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">📅 Date</button>
          <button onClick={() => onDeleteGroup(groupId, name, rmas.length)} className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">🗑 Delete</button>
        </div>
      </div>
      {expanded && (
        <div className="divide-y divide-gray-50 px-4">
          {rmas.map((rma) => <DeviceRow key={rma.id} rma={rma} onNavigate={onNavigate} onMoveDevice={onMoveDevice} onDeleteDevice={onDeleteDevice} indent />)}
        </div>
      )}
    </div>
  );
}

function DeviceRow({ rma, onNavigate, onMoveDevice, onDeleteDevice, indent = false }: {
  rma: RMA; indent?: boolean;
  onNavigate: (id: number) => void;
  onMoveDevice: (rma: RMA) => void;
  onDeleteDevice: (rma: RMA) => void;
}): React.JSX.Element {
  return (
    <div className={`flex items-center gap-3 py-3 ${indent ? 'pl-4' : ''}`}>
      <div className="flex-1 min-w-0">
        <span className="font-bold text-blue-600 text-sm">RMA #{rma.rma_number}</span>
        <span className="ml-2 text-sm text-gray-600">{rma.serial_number}</span>
        {rma.device_type && <span className="ml-2 text-xs text-gray-400">{rma.device_type}</span>}
      </div>
      <span className="rounded px-2 py-0.5 text-xs text-white flex-shrink-0" style={{ backgroundColor: STATE_COLORS[rma.state] }}>
        {STATE_LABELS[rma.state]}
      </span>
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={() => onNavigate(rma.id)} className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700">View</button>
        <button onClick={() => onMoveDevice(rma)} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">Move</button>
        <button onClick={() => onDeleteDevice(rma)} className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
      </div>
    </div>
  );
}

// ── Flat List View ───────────────────────────────────────────────────────

function FlatListView({ rmas, onNavigate }: { rmas: RMA[]; onNavigate: (id: number) => void }): React.JSX.Element {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-5 text-lg font-semibold text-gray-900">All RMAs ({rmas.length})</h2>
      {rmas.length === 0 ? <div className="py-10 text-center text-gray-500">No RMAs found</div> : (
        <div className="flex flex-col">
          <div className="mb-2 grid grid-cols-[80px_150px_120px_120px_100px_120px_100px] gap-4 rounded bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900">
            <div>RMA #</div><div>Serial</div><div>Owner</div><div>State</div><div>Priority</div><div>Created</div><div>Actions</div>
          </div>
          {rmas.map((rma) => (
            <div key={rma.id} className="grid grid-cols-[80px_150px_120px_120px_100px_120px_100px] items-center gap-4 border-b border-gray-100 px-4 py-3 text-sm">
              <div className="font-bold text-blue-600">#{rma.rma_number}</div>
              <div>{rma.serial_number}</div>
              <div>{rma.owner?.username ?? 'N/A'}</div>
              <div><span className="inline-block rounded px-2 py-1 text-xs text-white" style={{ backgroundColor: STATE_COLORS[rma.state] }}>{STATE_LABELS[rma.state]}</span></div>
              <div><span className="inline-block rounded px-2 py-1 text-xs text-white" style={{ backgroundColor: PRIORITY_COLORS[rma.priority] }}>{rma.priority}</span></div>
              <div>{new Date(rma.created_at).toLocaleDateString()}</div>
              <div><button onClick={() => onNavigate(rma.id)} className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700">View</button></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared modal helpers ─────────────────────────────────────────────────

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-gray-900">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onCancel, onConfirm, label, loading, disabled, danger }: {
  onCancel: () => void; onConfirm: () => void; label: string;
  loading: boolean; disabled?: boolean; danger?: boolean;
}): React.JSX.Element {
  return (
    <div className="flex justify-end gap-3">
      <button onClick={onCancel} disabled={loading} className="rounded-md bg-gray-400 px-5 py-2 text-sm text-white hover:bg-gray-500">Cancel</button>
      <button onClick={onConfirm} disabled={loading || disabled}
        className={`rounded-md px-5 py-2 text-sm font-medium text-white disabled:opacity-50 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        {loading ? 'Working…' : label}
      </button>
    </div>
  );
}
