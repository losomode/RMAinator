import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@inator/shared/auth/AuthProvider';
import { rmaApi } from '../api';
import { STATE_COLORS, PRIORITY_COLORS } from '../types';
import type { RMA, RMAState } from '../types';

const VALID_TRANSITIONS: Record<string, RMAState[]> = {
  SUBMITTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['RECEIVED'],
  RECEIVED: ['DIAGNOSED'],
  DIAGNOSED: ['REPAIRED', 'REPLACED'],
  REPAIRED: ['SHIPPED'],
  REPLACED: ['SHIPPED'],
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
  SHIPPED: 5,
};

const REVERTABLE_FROM: RMAState[] = [
  'APPROVED',
  'RECEIVED',
  'DIAGNOSED',
  'REPAIRED',
  'REPLACED',
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
  const [editingFields, setEditingFields] = useState(false);
  const [adminFields, setAdminFields] = useState<Record<string, string | boolean>>({
    priority: '',
    root_cause: '',
    parts_replaced: '',
    cost_to_repair: '',
    tx2_mac: '',
    rma_received_date: '',
    return_date: '',
    script_ran: false,
    services_enabled: false,
    uptime_good: false,
    stream_good: false,
    ship_ready: false,
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
    const raw = data as unknown as Record<string, unknown>;
    setAdminFields({
      priority: data.priority || 'NORMAL',
      root_cause: (raw.root_cause as string) || '',
      parts_replaced: (raw.parts_replaced as string) || '',
      cost_to_repair: (raw.cost_to_repair as string) || '',
      tx2_mac: (raw.tx2_mac as string) || '',
      rma_received_date: (raw.rma_received_date as string) || '',
      return_date: (raw.return_date as string) || '',
      script_ran: !!raw.script_ran,
      services_enabled: !!raw.services_enabled,
      uptime_good: !!raw.uptime_good,
      stream_good: !!raw.stream_good,
      ship_ready: !!raw.ship_ready,
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
      const result = await rmaApi.updateState(id!, payload);
      setRma(result.rma);
      populateAdminFields(result.rma);
      setTransitionNotes('');
      setRejectionReason('');
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
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const payload: Record<string, string | boolean | null> = { ...adminFields };
      for (const field of ['rma_received_date', 'return_date']) {
        if (payload[field] === '') payload[field] = null;
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
      {/* Back button */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => navigate('/')}
          className="rounded-md bg-gray-500 px-5 py-2 text-sm font-medium text-white hover:bg-gray-600"
        >
          ← Back to Dashboard
        </button>
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
          className="rounded-full px-6 py-2 text-base font-semibold uppercase text-white"
          style={{ backgroundColor: STATE_COLORS[rma.state] }}
        >
          {rma.state}
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
            transitioning={transitioning}
            revertState={revertState}
            onRejectionReasonChange={setRejectionReason}
            onTransitionNotesChange={setTransitionNotes}
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
            onEdit={() => setEditingFields(true)}
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
      <DetailRow
        label="First Ship Date"
        value={rma.first_ship_date ? new Date(rma.first_ship_date).toLocaleDateString() : 'N/A'}
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
              <div
                key={attachment.id}
                className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900"
              >
                📎 {attachment.filename}
                <span className="ml-2 text-xs text-gray-400">
                  ({(attachment.file_size / 1024).toFixed(1)} KB)
                </span>
              </div>
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
  transitioning,
  revertState,
  onRejectionReasonChange,
  onTransitionNotesChange,
  onRevertStateChange,
  onTransition,
}: {
  rma: RMA;
  stateError: string;
  rejectionReason: string;
  transitionNotes: string;
  transitioning: boolean;
  revertState: RMAState | '';
  onRejectionReasonChange: (v: string) => void;
  onTransitionNotesChange: (v: string) => void;
  onRevertStateChange: (v: RMAState | '') => void;
  onTransition: (state: RMAState, isRevert: boolean) => void;
}): React.JSX.Element {
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

      {VALID_TRANSITIONS[rma.state] && (
        <div className="flex flex-wrap gap-3">
          {VALID_TRANSITIONS[rma.state]?.map((nextState) => (
            <button
              key={nextState}
              onClick={() => onTransition(nextState, false)}
              disabled={transitioning}
              className={`rounded-md px-6 py-2 text-sm font-semibold text-white ${
                nextState === 'REJECTED'
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
              data-testid={`transition-${nextState.toLowerCase()}`}
            >
              {transitioning ? 'Updating...' : `→ ${nextState}`}
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
                      {s}
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
  adminFields: Record<string, string | boolean>;
  editingFields: boolean;
  saving: boolean;
  saveError: string;
  saveSuccess: string;
  onFieldChange: (field: string, value: string | boolean) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}): React.JSX.Element {
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
          label="RMA Received Date"
          type="date"
          value={adminFields.rma_received_date as string}
          onChange={(v) => onFieldChange('rma_received_date', v)}
          disabled={!editingFields}
          testId="admin-rma-received-date"
        />
        <AdminField
          label="Return Date"
          type="date"
          value={adminFields.return_date as string}
          onChange={(v) => onFieldChange('return_date', v)}
          disabled={!editingFields}
          testId="admin-return-date"
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
          label="TX2 MAC"
          type="text"
          value={adminFields.tx2_mac as string}
          onChange={(v) => onFieldChange('tx2_mac', v)}
          disabled={!editingFields}
          testId="admin-tx2-mac"
        />
      </div>

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

      <div className="mb-4">
        <label className="mb-1 block text-sm font-semibold text-gray-600">
          Parts Replaced:
        </label>
        <textarea
          value={adminFields.parts_replaced as string}
          onChange={(e) => onFieldChange('parts_replaced', e.target.value)}
          disabled={!editingFields}
          className="w-full rounded-md border border-gray-300 p-2 text-sm"
          data-testid="admin-parts-replaced"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {(
          [
            'script_ran',
            'services_enabled',
            'uptime_good',
            'stream_good',
            'ship_ready',
          ] as const
        ).map((field) => (
          <label
            key={field}
            className="flex cursor-pointer items-center gap-2 text-sm text-gray-900"
          >
            <input
              type="checkbox"
              checked={adminFields[field] as boolean}
              onChange={(e) => onFieldChange(field, e.target.checked)}
              disabled={!editingFields}
              data-testid={`admin-${field.replace(/_/g, '-')}`}
            />
            {field.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </label>
        ))}
      </div>
    </div>
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
                    {history.to_state}
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
}: {
  label: string;
  type: 'text' | 'date' | 'select';
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  options?: string[];
  testId: string;
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
    </div>
  );
}
