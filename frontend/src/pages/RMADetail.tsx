import { useState, useEffect, type CSSProperties } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { rmaAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
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
  SUBMITTED: 0, APPROVED: 1, RECEIVED: 2, DIAGNOSED: 3,
  REPAIRED: 4, REPLACED: 4, SHIPPED: 5,
};

const REVERTABLE_FROM: RMAState[] = [
  'APPROVED', 'RECEIVED', 'DIAGNOSED', 'REPAIRED', 'REPLACED', 'SHIPPED',
];

const RMADetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [rma, setRma] = useState<RMA | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [transitionNotes, setTransitionNotes] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [transitioning, setTransitioning] = useState<boolean>(false);
  const [stateError, setStateError] = useState<string>('');
  const [revertState, setRevertState] = useState<RMAState | ''>('');
  const [editingFields, setEditingFields] = useState<boolean>(false);
  const [adminFields, setAdminFields] = useState<Record<string, string | boolean>>({
    priority: '', root_cause: '', parts_replaced: '', cost_to_repair: '',
    tx2_mac: '', rma_received_date: '', return_date: '',
    script_ran: false, services_enabled: false, uptime_good: false,
    stream_good: false, ship_ready: false,
  });
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<string>('');

  useEffect(() => {
    loadRMADetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadRMADetail = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await rmaAPI.get(id!);
      setRma(response.data);
      populateAdminFields(response.data);
    } catch (err) {
      setError('Failed to load RMA details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const populateAdminFields = (data: RMA): void => {
    setAdminFields({
      priority: data.priority || 'NORMAL',
      root_cause: (data as Record<string, unknown>).root_cause as string || '',
      parts_replaced: (data as Record<string, unknown>).parts_replaced as string || '',
      cost_to_repair: (data as Record<string, unknown>).cost_to_repair as string || '',
      tx2_mac: (data as Record<string, unknown>).tx2_mac as string || '',
      rma_received_date: (data as Record<string, unknown>).rma_received_date as string || '',
      return_date: (data as Record<string, unknown>).return_date as string || '',
      script_ran: !!(data as Record<string, unknown>).script_ran,
      services_enabled: !!(data as Record<string, unknown>).services_enabled,
      uptime_good: !!(data as Record<string, unknown>).uptime_good,
      stream_good: !!(data as Record<string, unknown>).stream_good,
      ship_ready: !!(data as Record<string, unknown>).ship_ready,
    });
  };

  const handleStateTransition = async (newState: RMAState, isRevert = false): Promise<void> => {
    if (newState === 'REJECTED' && !rejectionReason.trim()) {
      setStateError('Rejection reason is required');
      return;
    }
    // Confirmation for closing (terminal states)
    if (TERMINAL_STATES.includes(newState)) {
      if (!window.confirm('Are you sure you want to close this RMA? This cannot be undone.')) return;
    }
    // Confirmation for reverting
    if (isRevert) {
      if (!window.confirm('This violates normal RMA workflow. Are you sure?')) return;
    }
    setTransitioning(true);
    setStateError('');
    try {
      const data: Record<string, unknown> = { state: newState, notes: transitionNotes };
      if (newState === 'REJECTED') {
        data.notes = transitionNotes || `Rejected: ${rejectionReason}`;
      }
      const response = await rmaAPI.updateState(id!, data);
      setRma(response.data.rma);
      populateAdminFields(response.data.rma);
      setTransitionNotes('');
      setRejectionReason('');
      // If rejected, also save the rejection_reason field
      if (newState === 'REJECTED') {
        await rmaAPI.update(id!, { rejection_reason: rejectionReason } as Partial<RMA>);
      }
    } catch (err) {
      const axiosErr = err as { response?: { data?: { error?: string; state?: string[] } } };
      const msg = axiosErr.response?.data?.state?.[0] || axiosErr.response?.data?.error || 'Failed to update state';
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
      // Sanitize payload: convert empty date strings to null for Django DateField
      const payload: Record<string, string | boolean | null> = { ...adminFields };
      for (const field of ['rma_received_date', 'return_date']) {
        if (payload[field] === '') payload[field] = null;
      }
      const response = await rmaAPI.update(id!, payload as unknown as Partial<RMA>);
      setRma(prev => prev ? { ...prev, ...response.data } : prev);
      setSaveSuccess('Fields saved successfully');
      setEditingFields(false);
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      setSaveError('Failed to save fields');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const getStateColor = (state: RMAState): string => {
    const colors = {
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
    return colors[state] || '#6c757d';
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading RMA details...</div>
      </div>
    );
  }

  if (error || !rma) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error || 'RMA not found'}</div>
        <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>
          ← Back to Dashboard
        </button>
      </div>

      <div style={styles.content}>
        {/* RMA Header */}
        <div style={styles.titleSection}>
          <div>
            <h1 style={styles.title}>RMA #{rma.rma_number}</h1>
            {rma.group_id && (
              <div style={styles.groupBadge}>
                📦 Group #{rma.group_id}
              </div>
            )}
          </div>
          <div
            style={{
              ...styles.stateBadge,
              backgroundColor: getStateColor(rma.state),
            }}
          >
            {rma.state}
          </div>
        </div>

        <div style={styles.twoColumn}>
          {/* Left Column - Device Details */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Device Information</h2>
            
            <div style={styles.detailRow}>
              <span style={styles.label}>Serial Number:</span>
              <span style={styles.value}>{rma.serial_number}</span>
            </div>

            <div style={styles.detailRow}>
              <span style={styles.label}>Priority:</span>
              <span style={{
                ...styles.priorityBadge,
                backgroundColor: rma.priority === 'HIGH' ? '#dc3545' : 
                                 rma.priority === 'LOW' ? '#6c757d' : '#ffc107'
              }}>
                {rma.priority}
              </span>
            </div>

            <div style={styles.detailRow}>
              <span style={styles.label}>First Ship Date:</span>
              <span style={styles.value}>
                {rma.first_ship_date ? new Date(rma.first_ship_date).toLocaleDateString() : 'N/A'}
              </span>
            </div>

            <div style={styles.detailRow}>
              <span style={styles.label}>Created:</span>
              <span style={styles.value}>{formatDate(rma.created_at)}</span>
            </div>

            {rma.is_archived && (
              <div style={styles.detailRow}>
                <span style={styles.label}>
                  {rma.state === 'COMPLETED' ? 'Completed:' : 'Closed:'}
                </span>
                <span style={styles.value}>{formatDate(rma.updated_at)}</span>
              </div>
            )}

            <div style={styles.detailSection}>
              <span style={styles.label}>Issue Description:</span>
              <div style={styles.notesBox}>
                {rma.fault_notes || 'No description provided'}
              </div>
            </div>

            {rma.state === 'REJECTED' && rma.rejection_reason && (
              <div style={styles.detailSection}>
                <span style={styles.label}>Rejection Reason:</span>
                <div style={{ ...styles.notesBox, backgroundColor: '#fee', borderLeft: '4px solid #dc3545' }}>
                  {rma.rejection_reason}
                </div>
              </div>
            )}

          {rma.attachments && rma.attachments.length > 0 && (
              <div style={styles.detailSection}>
                <span style={styles.label}>Attachments:</span>
                <div style={styles.attachmentList}>
                  {rma.attachments.map(attachment => (
                    <div key={attachment.id} style={styles.attachment}>
                      📎 {attachment.filename}
                      <span style={styles.fileSize}>
                        ({(attachment.file_size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Admin State Transition Controls */}
          {isAdmin && !rma.is_archived && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Update Status</h2>
              
              {stateError && <div style={styles.errorMsg}>{stateError}</div>}

              {VALID_TRANSITIONS[rma.state]?.includes('REJECTED') && (
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Rejection Reason:</label>
                  <textarea
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="Required when rejecting..."
                    style={styles.textarea}
                    data-testid="rejection-reason"
                  />
                </div>
              )}

              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>Notes (optional):</label>
                <textarea
                  value={transitionNotes}
                  onChange={e => setTransitionNotes(e.target.value)}
                  placeholder="Add notes for this state change..."
                  style={styles.textarea}
                  data-testid="transition-notes"
                />
              </div>

              {/* Forward transitions */}
              {VALID_TRANSITIONS[rma.state] && (
                <div style={styles.buttonRow}>
                  {VALID_TRANSITIONS[rma.state]?.map(nextState => (
                    <button
                      key={nextState}
                      onClick={() => handleStateTransition(nextState)}
                      disabled={transitioning}
                      style={{
                        ...styles.transitionBtn,
                        backgroundColor: nextState === 'REJECTED' ? '#dc3545' : '#28a745',
                      }}
                      data-testid={`transition-${nextState.toLowerCase()}`}
                    >
                      {transitioning ? 'Updating...' : `→ ${nextState}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Admin: Revert to earlier state */}
              {REVERTABLE_FROM.includes(rma.state) && (() => {
                const currentOrder = STATE_ORDER[rma.state] ?? 99;
                const revertOptions = Object.entries(STATE_ORDER)
                  .filter(([, order]) => order < currentOrder)
                  .map(([s]) => s as RMAState);
                return revertOptions.length > 0 ? (
                  <div style={{ ...styles.fieldGroup, marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                    <label style={styles.fieldLabel}>Revert to Earlier State:</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select
                        value={revertState}
                        onChange={e => setRevertState(e.target.value as RMAState)}
                        style={{ ...styles.select, flex: 1 }}
                        data-testid="admin-revert-select"
                      >
                        <option value="">Select state...</option>
                        {revertOptions.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => { if (revertState) { handleStateTransition(revertState, true); setRevertState(''); } }}
                        disabled={transitioning || !revertState}
                        style={{ ...styles.transitionBtn, backgroundColor: '#e67e22' }}
                        data-testid="admin-revert-btn"
                      >
                        {transitioning ? 'Updating...' : 'Revert'}
                      </button>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* Admin Field Editing */}
          {isAdmin && (
            <div style={styles.card}>
              <div style={styles.cardHeaderRow}>
                <h2 style={styles.cardTitle}>Admin Fields</h2>
                {!editingFields ? (
                  <button onClick={() => setEditingFields(true)} style={styles.editBtn} data-testid="edit-fields-btn">
                    ✏️ Edit
                  </button>
                ) : (
                  <div style={styles.buttonRow}>
                    <button onClick={handleSaveFields} disabled={saving} style={styles.saveBtn} data-testid="save-fields-btn">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => { setEditingFields(false); if (rma) populateAdminFields(rma); }} style={styles.cancelBtn}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {saveError && <div style={styles.errorMsg}>{saveError}</div>}
              {saveSuccess && <div style={styles.successMsg}>{saveSuccess}</div>}

              <div style={styles.adminGrid}>
                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Priority:</label>
                  <select
                    value={adminFields.priority as string}
                    onChange={e => setAdminFields(f => ({ ...f, priority: e.target.value }))}
                    disabled={!editingFields}
                    style={styles.select}
                    data-testid="admin-priority"
                  >
                    <option value="LOW">LOW</option>
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>RMA Received Date:</label>
                  <input
                    type="date"
                    value={adminFields.rma_received_date as string}
                    onChange={e => setAdminFields(f => ({ ...f, rma_received_date: e.target.value }))}
                    disabled={!editingFields}
                    style={styles.input}
                    data-testid="admin-rma-received-date"
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Return Date:</label>
                  <input
                    type="date"
                    value={adminFields.return_date as string}
                    onChange={e => setAdminFields(f => ({ ...f, return_date: e.target.value }))}
                    disabled={!editingFields}
                    style={styles.input}
                    data-testid="admin-return-date"
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>Cost to Repair:</label>
                  <input
                    type="text"
                    value={adminFields.cost_to_repair as string}
                    onChange={e => setAdminFields(f => ({ ...f, cost_to_repair: e.target.value }))}
                    disabled={!editingFields}
                    style={styles.input}
                    data-testid="admin-cost-to-repair"
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.fieldLabel}>TX2 MAC:</label>
                  <input
                    type="text"
                    value={adminFields.tx2_mac as string}
                    onChange={e => setAdminFields(f => ({ ...f, tx2_mac: e.target.value }))}
                    disabled={!editingFields}
                    style={styles.input}
                    data-testid="admin-tx2-mac"
                  />
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>Root Cause:</label>
                <textarea
                  value={adminFields.root_cause as string}
                  onChange={e => setAdminFields(f => ({ ...f, root_cause: e.target.value }))}
                  disabled={!editingFields}
                  style={styles.textarea}
                  data-testid="admin-root-cause"
                />
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>Parts Replaced:</label>
                <textarea
                  value={adminFields.parts_replaced as string}
                  onChange={e => setAdminFields(f => ({ ...f, parts_replaced: e.target.value }))}
                  disabled={!editingFields}
                  style={styles.textarea}
                  data-testid="admin-parts-replaced"
                />
              </div>

              <div style={styles.checkboxGrid}>
                {(['script_ran', 'services_enabled', 'uptime_good', 'stream_good', 'ship_ready'] as const).map(field => (
                  <label key={field} style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={adminFields[field] as boolean}
                      onChange={e => setAdminFields(f => ({ ...f, [field]: e.target.checked }))}
                      disabled={!editingFields}
                      data-testid={`admin-${field.replace(/_/g, '-')}`}
                    />
                    {field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Right Column - State History */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Status History</h2>
            
            {rma.state_history && rma.state_history.length > 0 ? (
              <div style={styles.timeline}>
                {rma.state_history.map((history, index) => (
                  <div key={history.id} style={styles.timelineItem}>
                    <div style={styles.timelineDot}></div>
                    {rma.state_history && index < rma.state_history.length - 1 && (
                      <div style={styles.timelineLine}></div>
                    )}
                    <div style={styles.timelineContent}>
                      <div style={styles.timelineHeader}>
                        <span
                          style={{
                            ...styles.timelineState,
                            color: getStateColor(history.to_state),
                          }}
                        >
                          {history.to_state}
                        </span>
                        <span style={styles.timelineDate}>
                          {formatDate(history.changed_at)}
                        </span>
                      </div>
                      {history.changed_by && (
                        <div style={styles.timelineUser}>
                          By: {history.changed_by.username}
                        </div>
                      )}
                      {history.notes && (
                        <div style={styles.timelineNotes}>
                          {history.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyState}>
                No status history available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: '20px 60px',
    borderBottom: '1px solid #ddd',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  backBtn: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  content: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '40px 60px',
  },
  titleSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '20px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 8px 0',
  },
  groupBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
  },
  stateBadge: {
    padding: '10px 24px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '24px',
    paddingBottom: '12px',
    borderBottom: '2px solid #f0f0f0',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f5f5f5',
  },
  detailSection: {
    marginTop: '20px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
  },
  value: {
    fontSize: '14px',
    color: '#333',
    fontWeight: '500',
  },
  priorityBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
  },
  notesBox: {
    marginTop: '8px',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#333',
    whiteSpace: 'pre-wrap',
  },
  attachmentList: {
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  attachment: {
    padding: '10px 12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#333',
  },
  fileSize: {
    fontSize: '12px',
    color: '#999',
    marginLeft: '8px',
  },
  timeline: {
    position: 'relative',
  },
  timelineItem: {
    position: 'relative',
    paddingLeft: '32px',
    paddingBottom: '24px',
  },
  timelineDot: {
    position: 'absolute',
    left: '0',
    top: '4px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#007bff',
    border: '2px solid white',
    boxShadow: '0 0 0 2px #007bff',
  },
  timelineLine: {
    position: 'absolute',
    left: '5px',
    top: '16px',
    bottom: '0',
    width: '2px',
    backgroundColor: '#e0e0e0',
  },
  timelineContent: {
    backgroundColor: '#f8f9fa',
    padding: '12px 16px',
    borderRadius: '6px',
  },
  timelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  timelineState: {
    fontSize: '16px',
    fontWeight: '600',
  },
  timelineDate: {
    fontSize: '12px',
    color: '#999',
  },
  timelineUser: {
    fontSize: '13px',
    color: '#666',
    marginTop: '4px',
  },
  timelineNotes: {
    fontSize: '13px',
    color: '#555',
    marginTop: '8px',
    fontStyle: 'italic',
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    fontSize: '18px',
    color: '#666',
  },
  error: {
    backgroundColor: '#fee',
    color: '#c33',
    padding: '16px',
    borderRadius: '4px',
    margin: '20px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: '#999',
    fontSize: '14px',
  },
  errorMsg: {
    backgroundColor: '#fee',
    color: '#c33',
    padding: '10px 16px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  successMsg: {
    backgroundColor: '#efe',
    color: '#363',
    padding: '10px 16px',
    borderRadius: '4px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  fieldGroup: {
    marginBottom: '16px',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#555',
    marginBottom: '4px',
  },
  textarea: {
    width: '100%',
    minHeight: '60px',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '14px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  transitionBtn: {
    padding: '10px 24px',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  cardHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  editBtn: {
    padding: '6px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  saveBtn: {
    padding: '6px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  cancelBtn: {
    padding: '6px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  adminGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '16px',
  },
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginTop: '16px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#333',
    cursor: 'pointer',
  },
};

export default RMADetail;
