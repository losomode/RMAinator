import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { rmaAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const RMADetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [rma, setRma] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRMADetail();
  }, [id]);

  const loadRMADetail = async () => {
    try {
      setLoading(true);
      const response = await rmaAPI.get(id);
      setRma(response.data);
    } catch (err) {
      setError('Failed to load RMA details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStateColor = (state) => {
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

  const formatDate = (dateString) => {
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

          {/* Right Column - State History */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Status History</h2>
            
            {rma.state_history && rma.state_history.length > 0 ? (
              <div style={styles.timeline}>
                {rma.state_history.map((history, index) => (
                  <div key={history.id} style={styles.timelineItem}>
                    <div style={styles.timelineDot}></div>
                    {index < rma.state_history.length - 1 && (
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

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: '20px 60px',
    borderBottom: '1px solid #ddd',
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
};

export default RMADetail;
