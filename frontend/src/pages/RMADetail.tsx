import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@inator/shared/auth/AuthProvider';
import { rmaApi } from '../api';
import { STATE_COLORS, STATE_LABELS, PRIORITY_COLORS } from '../types';
import type { RMA, RMAState } from '../types';

const VALID_TRANSITIONS: Record<string, RMAState[]> = {
  SUBMITTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['RECEIVED'],
  RECEIVED: ['DIAGNOSED'],
  DIAGNOSED: ['REPAIRED', 'REPLACED'],
  REPAIRED: ['IN_QA'],
  REPLACED: ['IN_QA'],
  IN_QA: ['READY_FOR_RETURN'],
  READY_FOR_RETURN: ['SHIPPED'],
  SHIPPED: ['COMPLETED'],
};

const TERMINAL_STATES: RMAState[] = ['COMPLETED', 'REJECTED'];

const STATE_ORDER: Record<string, number> = {
  SUBMITTED: 0,
  APPROVED: 1,
  RECEIVED: 2,
  DIAGNOSED: 3,
  REPAIRED: 4,
  REPLACED: 4,
  IN_QA: 5,
  READY_FOR_RETURN: 6,
  SHIPPED: 7,
};

const REVERTABLE_FROM: RMAState[] = [
  'APPROVED',
  'RECEIVED',
  'DIAGNOSED',
  'REPAIRED',
  'REPLACED',
  'IN_QA',
  'READY_FOR_RETURN',
  'SHIPPED',
];

/** Detailed view of a single RMA with state workflow and admin fields. */
export function RMADetail(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [rma, setRma] = useState<RMA | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transitionNotes, setTransitionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [stateError, setStateError] = useState('');
  const [revertState, setRevertState] = useState<RMAState | ''>('');
  const [shippingTrackingNumber, setShippingTrackingNumber] = useState('');

  // Snapshot of workflow-managed fields when entering edit mode
  const [workflowSnapshot, setWorkflowSnapshot] = useState({
    rma_received_date: '', return_date: '', return_tracking_number: '',
  });
  const [editingFields, setEditingFields] = useState(false);
  const [adminFields, setAdminFields] = useState<Record<string, string | boolean | string[]>>({
    priority: '',
    repair_notes: '',
    root_cause: '',
    parts_replaced: ['', ''],
    cost_to_repair: '',
    device_mac: '',
    return_tracking_number: '',
    first_ship_date: '',
    rma_received_date: '',
    return_date: '',
    qa_reflashed: false,
    qa_image_version: '',
    qa_nvme_data_ok: false,
    qa_services_ok: false,
    qa_uptime_ok: false,
    qa_stream_uptime_ok: false,
    qa_lens_control_ok: false,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    void loadRMADetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadRMADetail = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await rmaApi.get(id!);
      setRma(data);
      populateAdminFields(data);
    } catch {
      setError('Failed to load RMA details');
    } finally {
      setLoading(false);
    }
  };

  const populateAdminFields = (data: RMA): void => {
    const partsRaw = data.parts_replaced;
    const partsList: string[] =
      Array.isArray(partsRaw) && partsRaw.length > 0 ? [...partsRaw, ''] : ['', ''];
    setAdminFields({
      priority: data.priority || 'NORMAL',
      repair_notes: data.repair_notes ?? '',
      root_cause: data.root_cause ?? '',
      parts_replaced: partsList,
      cost_to_repair: data.cost_to_repair ?? '',
      device_mac: data.device_mac ?? '',
      return_tracking_number: data.return_tracking_number ?? '',
      first_ship_date: data.first_ship_date ?? '',
      rma_received_date: data.rma_received_date ?? '',
      return_date: data.return_date ?? '',
      qa_reflashed: data.qa_reflashed ?? false,
      qa_image_version: data.qa_image_version ?? '',
      qa_nvme_data_ok: data.qa_nvme_data_ok ?? false,
      qa_services_ok: data.qa_services_ok ?? false,
      qa_uptime_ok: data.qa_uptime_ok ?? false,
      qa_stream_uptime_ok: data.qa_stream_uptime_ok ?? false,
      qa_lens_control_ok: data.qa_lens_control_ok ?? false,
    });
  };

  const handleStateTransition = async (newState: RMAState, isRevert = false): Promise<void> => {
    if (newState === 'REJECTED' && !rejectionReason.trim()) {
      setStateError('Rejection reason is required');
      return;
    }
    if (TERMINAL_STATES.includes(newState)) {
      if (!window.confirm('Are you sure you want to close this RMA? This cannot be undone.'))
        return;
    }
    if (isRevert) {
      if (!window.confirm('This violates normal RMA workflow. Are you sure?')) return;
    }
    setTransitioning(true);
    setStateError('');
    try {
      const payload: Record<string, unknown> = { state: newState, notes: transitionNotes };
      if (newState === 'REJECTED') {
        payload.notes = transitionNotes || `Rejected: ${rejectionReason}`;
      }
      if (newState === 'SHIPPED' && shippingTrackingNumber.trim()) {
        payload.tracking_number = shippingTrackingNumber.trim();
      }
      const result = await rmaApi.updateState(id!, payload);
      setRma(result.rma);
      populateAdminFields(result.rma);
      setTransitionNotes('');
      setRejectionReason('');
      setShippingTrackingNumber('');
      if (newState === 'REJECTED') {
        await rmaApi.update(id!, { rejection_reason: rejectionReason } as Partial<RMA>);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; state?: string[] } } };
      const msg =
        axiosErr.response?.data?.state?.[0] ??
        axiosErr.response?.data?.error ??
        'Failed to update state';
      setStateError(msg);
    } finally {
      setTransitioning(false);
    }
  };

  const handleSaveFields = async (): Promise<void> => {
    // Warn if workflow-managed fields were manually changed
    const workflowChanged =
      (adminFields.rma_received_date as string) !== workflowSnapshot.rma_received_date ||
      (adminFields.return_date as string) !== workflowSnapshot.return_date ||
      (adminFields.return_tracking_number as string) !== workflowSnapshot.return_tracking_number;

    if (workflowChanged && !window.confirm(
      'Return Date, Return Tracking Number, and RMA Received Date are normally updated automatically by the status workflow.\n\nSave manual changes anyway?'
    )) return;

    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const payload: Record<string, string | boolean | null | string[]> = { ...adminFields };
      // Null out empty date fields
      for (const field of ['rma_received_date', 'return_date', 'first_ship_date']) {
        if (payload[field] === '') payload[field] = null;
      }
      // Trim empty parts_replaced entries
      if (Array.isArray(payload.parts_replaced)) {
        payload.parts_replaced = (payload.parts_replaced as string[]).filter((p) => p.trim() !== '');
      }
      const data = await rmaApi.update(id!, payload as unknown as Partial<RMA>);
      setRma((prev) => (prev ? { ...prev, ...data } : prev));
      setSaveSuccess('Fields saved successfully');
      setEditingFields(false);
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch {
      setSaveError('Failed to save fields');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="py-16 text-center text-lg text-gray-500">Loading RMA details...</div>;
  }

  if (error || !rma) {
    return (
      <div>
        <div className="mb-4 rounded-md bg-red-50 p-4 text-red-700">{error || 'RMA not found'}</div>
        <div className="flex justify-end">
          <button
            onClick={() => navigate('/')}
            className="rounded-md bg-gray-500 px-5 py-2 text-sm font-medium text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Back button + View Group */}
      <div className="mb-6 flex justify-end gap-3">
        <button
          onClick={() => navigate('/')}
          className="rounded-md bg-gray-500 px-5 py-2 text-sm font-medium text-white hover:bg-gray-600"
        >
          ← Back to Dashboard
        </button>
        {rma.group_id && (
          <button
            onClick={() => navigate(`/group/${String(rma.group_id)}`)}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            📦 View Group
          </button>
        )}
      </div>

      {/* Title */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-5">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">RMA #{rma.rma_number}</h1>
          {rma.group_id && (
            <span className="inline-block rounded-md bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              📦 Group #{rma.group_id}
            </span>
          )}
        </div>
        <span
          className="rounded-full px-6 py-2 text-base font-semibold text-white"
          style={{ backgroundColor: STATE_COLORS[rma.state] }}
        >
          {STATE_LABELS[rma.state]}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Device Information */}
        <DeviceInfo rma={rma} formatDate={formatDate} />

        {/* State Transition Controls (admin only, non-archived) */}
        {isAdmin && !rma.is_archived && (
          <StateControls
            rma={rma}
            stateError={stateError}
            rejectionReason={rejectionReason}
            transitionNotes={transitionNotes}
            shippingTrackingNumber={shippingTrackingNumber}
            transitioning={transitioning}
            revertState={revertState}
            onRejectionReasonChange={setRejectionReason}
            onTransitionNotesChange={setTransitionNotes}
            onShippingTrackingChange={setShippingTrackingNumber}
            onRevertStateChange={setRevertState}
            onTransition={(s, r) => void handleStateTransition(s, r)}
          />
        )}

        {/* Admin Fields */}
        {isAdmin && (
          <AdminFieldsSection
            adminFields={adminFields}
            editingFields={editingFields}
            saving={saving}
            saveError={saveError}
            saveSuccess={saveSuccess}
            onFieldChange={(f, v) => setAdminFields((prev) => ({ ...prev, [f]: v }))}
            onEdit={() => {
              setEditingFields(true);
              setWorkflowSnapshot({
                rma_received_date: adminFields.rma_received_date as string,
                return_date: adminFields.return_date as string,
                return_tracking_number: adminFields.return_tracking_number as string,
              });
            }}
            onSave={() => void handleSaveFields()}
            onCancel={() => {
              setEditingFields(false);
              if (rma) populateAdminFields(rma);
            }}
          />
        )}

        {/* State History */}
        <StateHistory rma={rma} formatDate={formatDate} />
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function DeviceInfo({
  rma,
  formatDate,
}: {
  rma: RMA;
  formatDate: (d: string | null) => string;
}): React.JSX.Element {
  return (
    <div className="rounded-lg bg-white p-8 shadow">
      <h2 className="mb-6 border-b-2 border-gray-100 pb-3 text-xl font-semibold text-gray-900">
        Device Information
      </h2>
      <DetailRow label="Serial Number" value={rma.serial_number} />
      {rma.company_name && <DetailRow label="Company" value={rma.company_name} />}
      <DetailRow
        label="Priority"
        value={
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: PRIORITY_COLORS[rma.priority] }}
          >
            {rma.priority}
          </span>
        }
      />
      <DetailRow label="Created" value={formatDate(rma.created_at)} />
      {rma.is_archived && (
        <DetailRow
          label={rma.state === 'COMPLETED' ? 'Completed' : 'Closed'}
          value={formatDate(rma.updated_at)}
        />
      )}

      <div className="mt-5">
        <span className="text-sm font-semibold text-gray-500">Issue Description:</span>
        <div className="mt-2 whitespace-pre-wrap rounded-md bg-gray-50 p-4 text-sm leading-relaxed text-gray-900">
          {rma.fault_notes || 'No description provided'}
        </div>
      </div>

      {rma.state === 'REJECTED' && rma.rejection_reason && (
        <div className="mt-5">
          <span className="text-sm font-semibold text-gray-500">Rejection Reason:</span>
          <div className="mt-2 rounded-md border-l-4 border-red-500 bg-red-50 p-4 text-sm text-gray-900">
            {rma.rejection_reason}
          </div>
        </div>
      )}

      {rma.attachments && rma.attachments.length > 0 && (
        <div className="mt-5">
          <span className="text-sm font-semibold text-gray-500">Attachments:</span>
          <div className="mt-2 flex flex-col gap-2">
            {rma.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.file}
                download
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-blue-700 hover:bg-gray-100"
              >
                📎 {attachment.filename}
                <span className="ml-1 text-xs text-gray-400">
                  ({(attachment.file_size / 1024).toFixed(1)} KB)
                </span>
                <span className="ml-auto text-xs text-gray-400">↓ download</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StateControls({
  rma,
  stateError,
  rejectionReason,
  transitionNotes,
  shippingTrackingNumber,
  transitioning,
  revertState,
  onRejectionReasonChange,
  onTransitionNotesChange,
  onShippingTrackingChange,
  onRevertStateChange,
  onTransition,
}: {
  rma: RMA;
  stateError: string;
  rejectionReason: string;
  transitionNotes: string;
  shippingTrackingNumber: string;
  transitioning: boolean;
  revertState: RMAState | '';
  onRejectionReasonChange: (v: string) => void;
  onTransitionNotesChange: (v: string) => void;
  onShippingTrackingChange: (v: string) => void;
  onRevertStateChange: (v: RMAState | '') => void;
  onTransition: (state: RMAState, isRevert: boolean) => void;
}): React.JSX.Element {
  const shippedIsNext = VALID_TRANSITIONS[rma.state]?.includes('SHIPPED');

  return (
    <div className="rounded-lg bg-white p-8 shadow">
      <h2 className="mb-6 border-b-2 border-gray-100 pb-3 text-xl font-semibold text-gray-900">
        Update Status
      </h2>

      {stateError && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{stateError}</div>
      )}

      {VALID_TRANSITIONS[rma.state]?.includes('REJECTED') && (
        <div className="mb-4">
          <label className="mb-1 block text-sm font-semibold text-gray-600">
            Rejection Reason:
          </label>
          <textarea
            value={rejectionReason}
            onChange={(e) => onRejectionReasonChange(e.target.value)}
            placeholder="Required when rejecting..."
            className="w-full rounded-md border border-gray-300 p-2 text-sm"
            data-testid="rejection-reason"
          />
        </div>
      )}

      {shippedIsNext ? (
        /* When SHIPPED is the next state, require a tracking number instead of generic notes */
        <div className="mb-4">
          <label className="mb-1 block text-sm font-semibold text-gray-600">
            Return Tracking Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={shippingTrackingNumber}
            onChange={(e) => onShippingTrackingChange(e.target.value)}
            placeholder="e.g. UPS-1Z999AA10123456784"
            className="w-full rounded-md border border-gray-300 p-2 text-sm"
            data-testid="shipping-tracking-number"
          />
          <p className="mt-2 text-xs text-gray-400">
            📦 Shipping multiple devices from the same group? Use{' '}
            <strong>Ship All</strong> or <strong>Create Partial Shipment</strong> from the group page
            to apply one tracking number to the whole batch. Enter tracking here for individual
            shipments only.
          </p>
        </div>
      ) : (
        <div className="mb-4">
          <label className="mb-1 block text-sm font-semibold text-gray-600">
            Notes (optional):
          </label>
          <textarea
            value={transitionNotes}
            onChange={(e) => onTransitionNotesChange(e.target.value)}
            placeholder="Add notes for this state change..."
            className="w-full rounded-md border border-gray-300 p-2 text-sm"
            data-testid="transition-notes"
          />
        </div>
      )}

      {VALID_TRANSITIONS[rma.state] && (
        <div className="flex flex-wrap gap-3">
          {VALID_TRANSITIONS[rma.state]?.map((nextState) => (
            <button
              key={nextState}
              onClick={() => onTransition(nextState, false)}
              disabled={transitioning || (nextState === 'SHIPPED' && !shippingTrackingNumber.trim())}
              className={`rounded-md px-6 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                nextState === 'REJECTED'
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
              data-testid={`transition-${nextState.toLowerCase()}`}
            >
              {transitioning ? 'Updating…' : `→ ${STATE_LABELS[nextState] ?? nextState}`}
            </button>
          ))}
        </div>
      )}

      {/* Revert controls */}
      {REVERTABLE_FROM.includes(rma.state) &&
        (() => {
          const currentOrder = STATE_ORDER[rma.state] ?? 99;
          const revertOptions = Object.entries(STATE_ORDER)
            .filter(([, order]) => order < currentOrder)
            .map(([s]) => s as RMAState);
          return revertOptions.length > 0 ? (
            <div className="mt-5 border-t border-gray-200 pt-4">
              <label className="mb-1 block text-sm font-semibold text-gray-600">
                Revert to Earlier State:
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={revertState}
                  onChange={(e) => onRevertStateChange(e.target.value as RMAState)}
                  className="flex-1 rounded-md border border-gray-300 p-2 text-sm"
                  data-testid="admin-revert-select"
                >
                  <option value="">Select state...</option>
                  {revertOptions.map((s) => (
                    <option key={s} value={s}>
                      {STATE_LABELS[s] ?? s}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (revertState) {
                      onTransition(revertState, true);
                      onRevertStateChange('');
                    }
                  }}
                  disabled={transitioning || !revertState}
                  className="rounded-md bg-orange-500 px-6 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                  data-testid="admin-revert-btn"
                >
                  {transitioning ? 'Updating...' : 'Revert'}
                </button>
              </div>
            </div>
          ) : null;
        })()}
    </div>
  );
}

function AdminFieldsSection({
  adminFields,
  editingFields,
  saving,
  saveError,
  saveSuccess,
  onFieldChange,
  onEdit,
  onSave,
  onCancel,
}: {
  adminFields: Record<string, string | boolean | string[]>;
  editingFields: boolean;
  saving: boolean;
  saveError: string;
  saveSuccess: string;
  onFieldChange: (field: string, value: string | boolean | string[]) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}): React.JSX.Element {
  const parts = adminFields.parts_replaced as string[];

  const updatePart = (idx: number, val: string): void => {
    const updated = [...parts];
    updated[idx] = val;
    onFieldChange('parts_replaced', updated);
  };

  const addPart = (): void => {
    onFieldChange('parts_replaced', [...parts, '']);
  };

  const removePart = (idx: number): void => {
    if (parts.length <= 1) return;
    onFieldChange('parts_replaced', parts.filter((_, i) => i !== idx));
  };

  return (
    <div className="rounded-lg bg-white p-8 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Admin Fields</h2>
        {!editingFields ? (
          <button
            onClick={onEdit}
            className="rounded-md bg-blue-600 px-4 py-1 text-sm text-white"
            data-testid="edit-fields-btn"
          >
            ✏️ Edit
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={onSave}
              disabled={saving}
              className="rounded-md bg-green-600 px-4 py-1 text-sm text-white"
              data-testid="save-fields-btn"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={onCancel}
              className="rounded-md bg-gray-500 px-4 py-1 text-sm text-white"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {saveError && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{saveError}</div>
      )}
      {saveSuccess && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          {saveSuccess}
        </div>
      )}

      {/* Grid fields */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AdminField
          label="Priority"
          type="select"
          value={adminFields.priority as string}
          onChange={(v) => onFieldChange('priority', v)}
          disabled={!editingFields}
          options={['LOW', 'NORMAL', 'HIGH']}
          testId="admin-priority"
        />
        <AdminField
          label="First Ship Date"
          type="date"
          value={adminFields.first_ship_date as string}
          onChange={(v) => onFieldChange('first_ship_date', v)}
          disabled={!editingFields}
          testId="admin-first-ship-date"
        />
        <AdminField
          label="RMA Received Date"
          type="date"
          value={adminFields.rma_received_date as string}
          onChange={(v) => onFieldChange('rma_received_date', v)}
          disabled={!editingFields}
          testId="admin-rma-received-date"
          helperText="Auto-set when status changes to RECEIVED"
        />
        <AdminField
          label="Return Date"
          type="date"
          value={adminFields.return_date as string}
          onChange={(v) => onFieldChange('return_date', v)}
          disabled={!editingFields}
          testId="admin-return-date"
          helperText="Auto-set when status changes to SHIPPED"
        />
        <AdminField
          label="Cost to Repair"
          type="text"
          value={adminFields.cost_to_repair as string}
          onChange={(v) => onFieldChange('cost_to_repair', v)}
          disabled={!editingFields}
          testId="admin-cost-to-repair"
        />
        <AdminField
          label="Device MAC"
          type="text"
          value={adminFields.device_mac as string}
          onChange={(v) => onFieldChange('device_mac', v)}
          disabled={!editingFields}
          testId="admin-device-mac"
        />
        <AdminField
          label="Return Tracking Number"
          type="text"
          value={adminFields.return_tracking_number as string}
          onChange={(v) => onFieldChange('return_tracking_number', v)}
          disabled={!editingFields}
          testId="admin-return-tracking-number"
          helperText="Auto-set when status changes to SHIPPED"
        />
      </div>

      {/* Root Cause */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-semibold text-gray-600">Root Cause:</label>
        <textarea
          value={adminFields.root_cause as string}
          onChange={(e) => onFieldChange('root_cause', e.target.value)}
          disabled={!editingFields}
          className="w-full rounded-md border border-gray-300 p-2 text-sm"
          data-testid="admin-root-cause"
        />
      </div>

      {/* Repair Notes — free-form admin scratch pad */}
      <div className="mt-6">
        <label className="mb-1 block text-sm font-bold text-gray-700">Repair Notes</label>
        <p className="mb-2 text-xs text-gray-400">Internal notes, observations, or anything worth remembering about this repair.</p>
        <textarea
          value={adminFields.repair_notes as string}
          onChange={(e) => onFieldChange('repair_notes', e.target.value)}
          disabled={!editingFields}
          rows={6}
          className="w-full rounded-md border border-gray-300 p-3 text-sm leading-relaxed"
          placeholder="e.g. lens focus motor replaced, re-flashed to v2.1.0, verified stream for 30 min before packaging…"
          data-testid="admin-repair-notes"
        />
      </div>

      {/* Parts Replaced — dynamic list */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-semibold text-gray-600">Parts Replaced:</label>
        <div className="flex flex-col gap-2">
          {parts.map((part, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={part}
                onChange={(e) => updatePart(idx, e.target.value)}
                disabled={!editingFields}
                className="flex-1 rounded-md border border-gray-300 p-2 text-sm"
                placeholder={`Part ${String(idx + 1)}`}
                data-testid={`admin-part-${String(idx)}`}
              />
              {editingFields && parts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePart(idx)}
                  className="rounded bg-red-400 px-2 py-1 text-xs text-white hover:bg-red-500"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {editingFields && (
          <button
            type="button"
            onClick={addPart}
            className="mt-2 rounded-md border border-dashed border-blue-400 px-3 py-1 text-xs text-blue-600 hover:bg-blue-50"
            data-testid="admin-add-part"
          >
            + Add part
          </button>
        )}
      </div>

      {/* Repair QA Checklist */}
      <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4">
        <h3 className="mb-4 text-sm font-bold text-gray-700">Repair QA Checklist</h3>
        <div className="flex flex-col gap-3">
          {/* Re-flashed + image version */}
          <div className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-900">
              <input
                type="checkbox"
                checked={adminFields.qa_reflashed as boolean}
                onChange={(e) => onFieldChange('qa_reflashed', e.target.checked)}
                disabled={!editingFields}
                data-testid="admin-qa-reflashed"
              />
              Re-flashed
            </label>
            <input
              type="text"
              value={adminFields.qa_image_version as string}
              onChange={(e) => onFieldChange('qa_image_version', e.target.value)}
              disabled={!editingFields || !(adminFields.qa_reflashed as boolean)}
              className="ml-6 w-48 rounded-md border border-gray-300 p-1.5 text-xs disabled:bg-gray-100 disabled:text-gray-400"
              placeholder="Image version"
              data-testid="admin-qa-image-version"
            />
          </div>

          <QACheckItem
            label="/data partition on NVMe"
            helper="(if applicable)"
            field="qa_nvme_data_ok"
            checked={adminFields.qa_nvme_data_ok as boolean}
            disabled={!editingFields}
            onFieldChange={onFieldChange}
          />
          <QACheckItem
            label="Services Installed & Enabled"
            field="qa_services_ok"
            checked={adminFields.qa_services_ok as boolean}
            disabled={!editingFields}
            onFieldChange={onFieldChange}
          />
          <QACheckItem
            label="Uptime >24 Hours"
            field="qa_uptime_ok"
            checked={adminFields.qa_uptime_ok as boolean}
            disabled={!editingFields}
            onFieldChange={onFieldChange}
          />
          <QACheckItem
            label="Stream Uptime >24 Hours"
            helper="(if applicable)"
            field="qa_stream_uptime_ok"
            checked={adminFields.qa_stream_uptime_ok as boolean}
            disabled={!editingFields}
            onFieldChange={onFieldChange}
          />
          <QACheckItem
            label="Lens Control Verified"
            helper="(if applicable)"
            field="qa_lens_control_ok"
            checked={adminFields.qa_lens_control_ok as boolean}
            disabled={!editingFields}
            onFieldChange={onFieldChange}
          />
        </div>
      </div>
    </div>
  );
}

function QACheckItem({
  label,
  helper,
  field,
  checked,
  disabled,
  onFieldChange,
}: {
  label: string;
  helper?: string;
  field: string;
  checked: boolean;
  disabled: boolean;
  onFieldChange: (field: string, value: string | boolean | string[]) => void;
}): React.JSX.Element {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-900">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onFieldChange(field, e.target.checked)}
        disabled={disabled}
        data-testid={`admin-${field.replace(/_/g, '-')}`}
      />
      {label}
      {helper && <span className="text-xs text-gray-400">{helper}</span>}
    </label>
  );
}

function StateHistory({
  rma,
  formatDate,
}: {
  rma: RMA;
  formatDate: (d: string | null) => string;
}): React.JSX.Element {
  return (
    <div className="rounded-lg bg-white p-8 shadow">
      <h2 className="mb-6 border-b-2 border-gray-100 pb-3 text-xl font-semibold text-gray-900">
        Status History
      </h2>

      {rma.state_history && rma.state_history.length > 0 ? (
        <div className="relative">
          {rma.state_history.map((history, index) => (
            <div key={history.id} className="relative pb-6 pl-8">
              <div className="absolute left-0 top-1 h-3 w-3 rounded-full border-2 border-white bg-blue-600 shadow-[0_0_0_2px_theme(colors.blue.600)]" />
              {rma.state_history && index < rma.state_history.length - 1 && (
                <div className="absolute bottom-0 left-[5px] top-4 w-0.5 bg-gray-200" />
              )}
              <div className="rounded-md bg-gray-50 p-3">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <span
                    className="text-base font-semibold"
                    style={{ color: STATE_COLORS[history.to_state] }}
                  >
                    {STATE_LABELS[history.to_state]}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(history.changed_at)}
                  </span>
                </div>
                {history.changed_by && (
                  <div className="mt-1 text-xs text-gray-500">
                    By: {history.changed_by.username}
                  </div>
                )}
                {history.notes && (
                  <div className="mt-2 text-xs italic text-gray-600">{history.notes}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-10 text-center text-sm text-gray-400">
          No status history available
        </div>
      )}
    </div>
  );
}

/** Simple detail row with label and value. */
function DetailRow({ label, value }: { label: string; value: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between border-b border-gray-50 py-3">
      <span className="text-sm font-semibold text-gray-500">{label}:</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

/** Admin field input supporting text, date, and select types. */
function AdminField({
  label,
  type,
  value,
  onChange,
  disabled,
  options,
  testId,
  helperText,
}: {
  label: string;
  type: 'text' | 'date' | 'select';
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  options?: string[];
  testId: string;
  helperText?: string;
}): React.JSX.Element {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-600">{label}:</label>
      {type === 'select' && options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-md border border-gray-300 p-2 text-sm"
          data-testid={testId}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-md border border-gray-300 p-2 text-sm"
          data-testid={testId}
        />
      )}
      {helperText && (
        <p className="mt-1 text-xs italic text-gray-400">{helperText}</p>
      )}
    </div>
  );
}
