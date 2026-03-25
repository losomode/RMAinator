import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@inator/shared/auth/AuthProvider';
import { rmaApi } from '../api';
import { STATE_COLORS, STATE_LABELS } from '../types';
import type { RMA, RMAGroup, RMAState, Shipment } from '../types';
import { getApiErrorMessage } from '@inator/shared/types';

/** Group Detail page — all devices in a group with bulk action controls. */
export function GroupDetail(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [group, setGroup] = useState<RMAGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Inline group name editing
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Bulk action state
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');

  // Ship All modal
  const [showShipAllModal, setShowShipAllModal] = useState(false);
  const [shipAllTracking, setShipAllTracking] = useState('');

  // Partial Shipment modal
  const [showPartialModal, setShowPartialModal] = useState(false);
  const [partialTracking, setPartialTracking] = useState('');
  const [selectedRmaIds, setSelectedRmaIds] = useState<Set<number>>(new Set());

  // Approve / Receive selection modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectionIds, setSelectionIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    void loadGroup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadGroup = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await rmaApi.getGroup(id!);
      setGroup(data);
      setNameInput(data.name);
    } catch {
      setError('Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async (): Promise<void> => {
    setSavingName(true);
    try {
      const updated = await rmaApi.updateGroup(id!, { name: nameInput });
      setGroup(updated);
      setEditingName(false);
    } catch {
      // keep editing open, show inline error
    } finally {
      setSavingName(false);
    }
  };

  const handleBulkState = async (
    state: RMAState,
    tracking?: string,
    rmaIds?: number[],
  ): Promise<void> => {
    setBulkLoading(true);
    setBulkError('');
    setBulkSuccess('');
    try {
      const result = await rmaApi.bulkGroupState(id!, state, tracking, rmaIds);
      setBulkSuccess(result.message);
      setGroup(result.group);
      setShowShipAllModal(false);
      setShowPartialModal(false);
      setShowApproveModal(false);
      setShowReceiveModal(false);
      setShipAllTracking('');
      setPartialTracking('');
      setSelectedRmaIds(new Set());
      setSelectionIds(new Set());
    } catch (err: unknown) {
      setBulkError(getApiErrorMessage(err, 'Bulk operation failed'));
    } finally {
      setBulkLoading(false);
    }
  };

  const togglePartialSelection = (rmaId: number): void => {
    setSelectedRmaIds((prev) => {
      const next = new Set(prev);
      if (next.has(rmaId)) next.delete(rmaId);
      else next.add(rmaId);
      return next;
    });
  };

  const toggleSelection = (rmaId: number): void => {
    setSelectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(rmaId)) next.delete(rmaId);
      else next.add(rmaId);
      return next;
    });
  };

  const selectAll = (eligibleIds: number[]): void => {
    setSelectionIds(new Set(eligibleIds));
  };

  const openApproveModal = (): void => {
    setSelectionIds(new Set());
    setBulkError('');
    setShowApproveModal(true);
  };

  const openReceiveModal = (): void => {
    setSelectionIds(new Set());
    setBulkError('');
    setShowReceiveModal(true);
  };

  const closeSelectionModal = (): void => {
    setShowApproveModal(false);
    setShowReceiveModal(false);
    setSelectionIds(new Set());
    setBulkError('');
  };

  if (loading) {
    return <div className="py-16 text-center text-lg text-gray-500">Loading group…</div>;
  }

  if (error || !group) {
    return (
      <div>
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-700">{error || 'Group not found'}</div>
        <button
          onClick={() => navigate('/')}
          className="rounded-md bg-gray-500 px-5 py-2 text-sm font-medium text-white"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const rmas = group.rmas;

  const allStates = rmas.map((r) => r.state);
  const anySubmitted = allStates.some((s) => s === 'SUBMITTED');
  const anyApproved = allStates.some((s) => s === 'APPROVED');
  const allSubmitted = allStates.length > 0 && allStates.every((s) => s === 'SUBMITTED');
  const allApproved = allStates.length > 0 && allStates.every((s) => s === 'APPROVED');
  const allReadyForReturn = allStates.length > 0 && allStates.every((s) => s === 'READY_FOR_RETURN');
  const anyReadyForReturn = allStates.some((s) => s === 'READY_FOR_RETURN');
  const anyShipped = allStates.some((s) => s === 'SHIPPED');
  const readyForReturnRmas = rmas.filter((r) => r.state === 'READY_FOR_RETURN');

  return (
    <div>
      {/* Back */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => navigate('/')}
          className="rounded-md bg-gray-500 px-5 py-2 text-sm font-medium text-white hover:bg-gray-600"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Group Header */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1">
            {editingName && isAdmin ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-lg font-bold text-gray-900"
                  placeholder="Group name (optional)"
                  autoFocus
                />
                <button
                  onClick={() => void handleSaveName()}
                  disabled={savingName}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
                >
                  {savingName ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditingName(false); setNameInput(group.name); }}
                  className="rounded-md bg-gray-400 px-4 py-2 text-sm text-white hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  {group.name ? group.name : `RMA Group #${String(group.id)}`}
                </h1>
                {!group.name && (
                  <span className="text-sm text-gray-400">(Group #{group.id})</span>
                )}
                {isAdmin && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-sm text-blue-500 hover:text-blue-700"
                    title="Rename group"
                  >
                    ✏️
                  </button>
                )}
              </div>
            )}

            <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
              {group.company_name && (
                <span className="rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                  🏢 {group.company_name}
                </span>
              )}
              <span>{group.device_count} device{group.device_count !== 1 ? 's' : ''}</span>
              <span>Created {new Date(group.created_at).toLocaleDateString()}</span>
            </div>

            {group.return_shipping_address && (
              <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-600">
                <strong>Return Address:</strong> {group.return_shipping_address}
              </div>
            )}
          </div>
        </div>

        {/* Bulk Actions (admin only) */}
        {isAdmin && rmas.length > 0 && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Bulk Actions</h3>
            {bulkError && (
              <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{bulkError}</div>
            )}
            {bulkSuccess && (
              <div className="mb-3 rounded-md bg-green-50 p-3 text-sm text-green-700">{bulkSuccess}</div>
            )}
            <div className="flex flex-wrap gap-3">
              <BulkButton
                label="Approve"
                enabled={anySubmitted}
                loading={bulkLoading}
                color="green"
                onClick={openApproveModal}
                tooltip={anySubmitted ? undefined : 'No devices are in Submitted state'}
              />
              <BulkButton
                label="Receive"
                enabled={anyApproved}
                loading={bulkLoading}
                color="blue"
                onClick={openReceiveModal}
                tooltip={anyApproved ? undefined : 'No devices are in Approved state'}
              />
              <BulkButton
                label="Ship All"
                enabled={allReadyForReturn}
                loading={bulkLoading}
                color="purple"
                onClick={() => { setShowShipAllModal(true); setBulkError(''); }}
                tooltip={allReadyForReturn ? undefined : 'All devices must be in Ready for Return state'}
              />
              <BulkButton
                label="Create Partial Shipment"
                enabled={anyReadyForReturn && !allReadyForReturn}
                loading={bulkLoading}
                color="indigo"
                onClick={() => { setShowPartialModal(true); setBulkError(''); }}
                tooltip={anyReadyForReturn && !allReadyForReturn ? undefined : allReadyForReturn ? 'Use Ship All when all devices are ready' : 'No devices are in Ready for Return state'}
              />
              <BulkButton
                label="Complete Shipped"
                enabled={anyShipped}
                loading={bulkLoading}
                color="gray"
                onClick={() => void handleBulkState('COMPLETED')}
                tooltip={anyShipped ? undefined : 'No devices are in Shipped state'}
              />
            </div>
          </div>
        )}
      </div>

      {/* Device List */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Devices ({rmas.length})</h2>
        {rmas.length === 0 ? (
          <p className="py-8 text-center text-gray-400">No devices in this group</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-100">
            {rmas.map((rma) => (
      <Link
        key={rma.id}
        to={`/${String(rma.id)}`}
        className="flex items-center gap-6 py-4 hover:bg-gray-50"
      >
        {/* Left: device identifiers */}
        <div className="flex-shrink-0 flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="font-bold text-blue-600">RMA #{rma.rma_number}</span>
            <span className="text-sm text-gray-600">{rma.serial_number}</span>
            {rma.device_type && (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {rma.device_type}
              </span>
            )}
          </div>
          {rma.fault_notes && (
            <span className="truncate text-xs text-gray-400" style={{ maxWidth: '38ch' }}>
              {rma.fault_notes}
            </span>
          )}
        </div>

        {/* Middle: most recent update note */}
        <div className="flex-1 min-w-0">
          {rma.latest_note && (
            <span className="line-clamp-2 text-xs italic text-blue-500">
              📝 {rma.latest_note}
            </span>
          )}
        </div>

        {/* Right: state badge */}
        <span
          className="flex-shrink-0 rounded-full px-4 py-1 text-xs font-semibold text-white"
          style={{ backgroundColor: STATE_COLORS[rma.state] }}
        >
          {STATE_LABELS[rma.state]}
        </span>
      </Link>
            ))}
          </div>
        )}
      </div>

      {/* Return Shipments Panel */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Return Shipments{group.shipments.length > 0 ? ` (${group.shipments.length})` : ''}
        </h2>
        {group.shipments.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No return shipments yet. Shipment records will appear here when devices are marked as Shipped.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {group.shipments.map((shipment) => (
              <ShipmentRow key={shipment.tracking_number} shipment={shipment} />
            ))}
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && (() => {
        const eligibleIds = rmas.filter((r) => r.state === 'SUBMITTED').map((r) => r.id);
        return (
          <SelectionModal
            title="Approve Devices"
            description="Select devices to approve. Only SUBMITTED devices can be approved."
            eligibleState="SUBMITTED"
            rmas={rmas}
            selectedIds={selectionIds}
            loading={bulkLoading}
            error={bulkError}
            onToggle={toggleSelection}
            onSelectAll={() => selectAll(eligibleIds)}
            onConfirm={() => void handleBulkState('APPROVED', undefined, Array.from(selectionIds))}
            onClose={closeSelectionModal}
            confirmLabel="Approve Selected"
            confirmColor="green"
          />
        );
      })()}

      {/* Receive Modal */}
      {showReceiveModal && (() => {
        const eligibleIds = rmas.filter((r) => r.state === 'APPROVED').map((r) => r.id);
        return (
          <SelectionModal
            title="Receive Devices"
            description="Select devices to mark as received. Only APPROVED devices can be received."
            eligibleState="APPROVED"
            rmas={rmas}
            selectedIds={selectionIds}
            loading={bulkLoading}
            error={bulkError}
            onToggle={toggleSelection}
            onSelectAll={() => selectAll(eligibleIds)}
            onConfirm={() => void handleBulkState('RECEIVED', undefined, Array.from(selectionIds))}
            onClose={closeSelectionModal}
            confirmLabel="Mark as Received"
            confirmColor="blue"
          />
        );
      })()}

      {/* Ship All Modal */}
      {showShipAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
            <h2 className="mb-3 text-xl font-bold text-gray-900">Ship All Devices</h2>
            <p className="mb-5 text-sm text-gray-600">
              All {rmas.length} devices are ready for return. Enter the return tracking number.
            </p>
            <label className="mb-1 block text-sm font-semibold text-gray-600">
              Return Tracking Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={shipAllTracking}
              onChange={(e) => setShipAllTracking(e.target.value)}
              className="mb-5 w-full rounded-md border border-gray-300 px-3 py-3 text-sm"
              placeholder="e.g., UPS-1Z999AA10123456784"
              autoFocus
            />
            {bulkError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{bulkError}</div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowShipAllModal(false); setBulkError(''); setShipAllTracking(''); }}
                className="rounded-md bg-gray-400 px-5 py-2 text-sm text-white hover:bg-gray-500"
                disabled={bulkLoading}
              >
                Cancel
              </button>
              <button
                onClick={() => void handleBulkState('SHIPPED', shipAllTracking)}
                disabled={bulkLoading || !shipAllTracking.trim()}
                className="rounded-md bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {bulkLoading ? 'Shipping…' : 'Confirm Shipment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Shipment Modal */}
      {showPartialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-xl">
            <h2 className="mb-2 text-xl font-bold text-gray-900">Create Partial Shipment</h2>
            <p className="mb-5 text-sm text-gray-600">
              Select the devices to ship. Only devices in <strong>Ready for Return</strong> state are eligible.
            </p>

            <label className="mb-1 block text-sm font-semibold text-gray-600">
              Return Tracking Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={partialTracking}
              onChange={(e) => setPartialTracking(e.target.value)}
              className="mb-5 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g., UPS-1Z999AA10123456784"
              autoFocus
            />

            <div className="mb-4 max-h-64 overflow-y-auto rounded-md border border-gray-200">
              {rmas.map((rma) => {
                const eligible = rma.state === 'READY_FOR_RETURN';
                return (
                  <label
                    key={rma.id}
                    className={`flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-0 ${
                      eligible ? 'cursor-pointer hover:bg-gray-50' : 'cursor-not-allowed opacity-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRmaIds.has(rma.id)}
                      onChange={() => eligible && togglePartialSelection(rma.id)}
                      disabled={!eligible}
                      className="h-4 w-4"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">RMA #{rma.rma_number}</span>
                      <span className="ml-2 text-xs text-gray-500">{rma.serial_number}</span>
                      {rma.device_type && (
                        <span className="ml-2 text-xs text-gray-400">{rma.device_type}</span>
                      )}
                    </div>
                    <span
                      className="rounded-full px-3 py-0.5 text-xs font-semibold text-white"
                      style={{ backgroundColor: STATE_COLORS[rma.state] }}
                    >
                      {STATE_LABELS[rma.state]}
                    </span>
                  </label>
                );
              })}
            </div>

            <p className="mb-4 text-xs text-gray-500">
              {selectedRmaIds.size} of {readyForReturnRmas.length} eligible device{
                readyForReturnRmas.length !== 1 ? 's' : ''
              } selected
            </p>

            {bulkError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{bulkError}</div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowPartialModal(false); setBulkError(''); setPartialTracking(''); setSelectedRmaIds(new Set()); }}
                className="rounded-md bg-gray-400 px-5 py-2 text-sm text-white hover:bg-gray-500"
                disabled={bulkLoading}
              >
                Cancel
              </button>
              <button
                onClick={() => void handleBulkState('SHIPPED', partialTracking, Array.from(selectedRmaIds))}
                disabled={bulkLoading || !partialTracking.trim() || selectedRmaIds.size === 0}
                className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {bulkLoading
                  ? 'Shipping…'
                  : `Ship ${String(selectedRmaIds.size)} Device${selectedRmaIds.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Reusable modal for selecting devices by eligible state (Approve / Receive). */
function SelectionModal({
  title,
  description,
  eligibleState,
  rmas,
  selectedIds,
  loading,
  error,
  onToggle,
  onSelectAll,
  onConfirm,
  onClose,
  confirmLabel,
  confirmColor,
}: {
  title: string;
  description: string;
  eligibleState: RMAState;
  rmas: RMA[];
  selectedIds: Set<number>;
  loading: boolean;
  error: string;
  onToggle: (id: number) => void;
  onSelectAll: () => void;
  onConfirm: () => void;
  onClose: () => void;
  confirmLabel: string;
  confirmColor: 'green' | 'blue';
}): React.JSX.Element {
  const colorMap = { green: 'bg-green-600 hover:bg-green-700', blue: 'bg-blue-600 hover:bg-blue-700' };
  const eligibleRmas = rmas.filter((r) => r.state === eligibleState);
  const allSelected = eligibleRmas.length > 0 && eligibleRmas.every((r) => selectedIds.has(r.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-xl">
        <h2 className="mb-2 text-xl font-bold text-gray-900">{title}</h2>
        <p className="mb-4 text-sm text-gray-600">{description}</p>

        {/* Select all */}
        {eligibleRmas.length > 0 && (
          <button
            onClick={onSelectAll}
            className="mb-3 rounded-md border border-blue-300 px-3 py-1 text-xs text-blue-700 hover:bg-blue-50"
          >
            {allSelected ? 'Deselect All' : 'Select All Eligible'}
          </button>
        )}

        <div className="mb-4 max-h-64 overflow-y-auto rounded-md border border-gray-200">
          {rmas.map((rma) => {
            const eligible = rma.state === eligibleState;
            return (
              <label
                key={rma.id}
                className={`flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-0 ${
                  eligible ? 'cursor-pointer hover:bg-gray-50' : 'cursor-not-allowed opacity-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(rma.id)}
                  onChange={() => eligible && onToggle(rma.id)}
                  disabled={!eligible}
                  className="h-4 w-4"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">RMA #{rma.rma_number}</span>
                  <span className="ml-2 text-xs text-gray-500">{rma.serial_number}</span>
                  {rma.device_type && (
                    <span className="ml-2 text-xs text-gray-400">{rma.device_type}</span>
                  )}
                </div>
                <span
                  className="rounded-full px-3 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: STATE_COLORS[rma.state] }}
                >
                  {STATE_LABELS[rma.state]}
                </span>
              </label>
            );
          })}
        </div>

        <p className="mb-4 text-xs text-gray-500">
          {selectedIds.size} of {eligibleRmas.length} eligible device{eligibleRmas.length !== 1 ? 's' : ''} selected
        </p>

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-md bg-gray-400 px-5 py-2 text-sm text-white hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || selectedIds.size === 0}
            className={`rounded-md px-5 py-2 text-sm font-medium text-white disabled:opacity-50 ${colorMap[confirmColor]}`}
          >
            {loading ? 'Updating…' : `${confirmLabel} (${String(selectedIds.size)})`}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShipmentRow({ shipment }: { shipment: Shipment }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const shipDate = shipment.ship_date
    ? new Date(shipment.ship_date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '—';

  return (
    <div className="rounded-md border border-gray-200">
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-gray-50"
      >
        <span className="text-sm font-bold text-gray-400">{expanded ? '▼' : '▶'}</span>

        {/* Tracking number */}
        <span className="flex-1 font-mono text-sm font-semibold text-gray-900">
          {shipment.tracking_number}
        </span>

        {/* Ship date */}
        <span className="text-sm text-gray-500">{shipDate}</span>

        {/* Device count badge */}
        <span className="rounded-full bg-blue-50 px-3 py-0.5 text-xs font-medium text-blue-700">
          {shipment.devices.length} device{shipment.devices.length !== 1 ? 's' : ''}
        </span>
      </button>

      {/* Expanded device list */}
      {expanded && (
        <div className="border-t border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2 text-left">RMA #</th>
                <th className="px-4 py-2 text-left">Serial Number</th>
                <th className="px-4 py-2 text-left">Device Type</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shipment.devices.map((device) => (
                <tr key={device.id}>
                  <td className="px-4 py-2 font-bold text-blue-600">#{device.rma_number}</td>
                  <td className="px-4 py-2 text-gray-700">{device.serial_number}</td>
                  <td className="px-4 py-2 text-gray-500">{device.device_type || '—'}</td>
                  <td className="px-4 py-2">
                    <span
                      className="rounded-full px-3 py-0.5 text-xs font-semibold text-white"
                      style={{ backgroundColor: STATE_COLORS[device.state] }}
                    >
                      {STATE_LABELS[device.state]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BulkButton({
  label,
  enabled,
  loading,
  color,
  onClick,
  tooltip,
}: {
  label: string;
  enabled: boolean;
  loading: boolean;
  color: 'green' | 'blue' | 'purple' | 'indigo' | 'gray';
  onClick: () => void;
  tooltip?: string;
}): React.JSX.Element {
  const colorMap: Record<string, string> = {
    green: 'bg-green-600 hover:bg-green-700',
    blue: 'bg-blue-600 hover:bg-blue-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    indigo: 'bg-indigo-500 hover:bg-indigo-600',
    gray: 'bg-gray-500 hover:bg-gray-600',
  };

  return (
    <button
      onClick={onClick}
      disabled={!enabled || loading}
      title={tooltip}
      className={`rounded-md px-5 py-2 text-sm font-medium text-white transition-opacity ${
        colorMap[color] ?? colorMap.gray
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {loading ? '…' : label}
    </button>
  );
}
