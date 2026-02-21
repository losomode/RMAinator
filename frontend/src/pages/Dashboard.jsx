import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { rmaAPI } from '../services/api';

const Dashboard = () => {
  const [rmas, setRmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState('all'); // 'all', 'individual', 'byGroup'
  
  const { user, logout, isVerified, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadRMAs();
  }, [showArchived]);

  const loadRMAs = async () => {
    try {
      setLoading(true);
      const response = await rmaAPI.list({ archived: showArchived });
      setRmas(response.data.results || response.data);
    } catch (err) {
      setError('Failed to load RMAs');
    } finally {
      setLoading(false);
    }
  };

  if (!isVerified) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h1>RMAinator</h1>
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
        <div style={styles.card}>
          <h2>Pending Approval</h2>
          <p>Your account is pending admin approval. Please wait for an administrator to verify your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>RMAinator</h1>
        <div style={styles.headerRight}>
          {isAdmin && (
            <button 
              onClick={() => navigate('/admin')} 
              style={styles.adminBtn}
            >
              Admin Dashboard
            </button>
          )}
          <span style={styles.username}>Welcome, {user?.username}</span>
          <div style={styles.buttonGroup}>
            <button 
              onClick={() => navigate('/profile')} 
              style={styles.profileBtn}
              title="Edit Profile"
            >
              👤 Profile
            </button>
            <button onClick={logout} style={styles.logoutBtn}>Logout</button>
          </div>
        </div>
      </div>

      <div style={styles.content}>
        <div style={styles.toolbar}>
          <h2>My RMAs</h2>
          <div style={styles.actions}>
            <button 
              onClick={() => setShowArchived(!showArchived)}
              style={styles.filterBtn}
            >
              {showArchived ? 'Show Active' : 'Show Completed'}
            </button>
            <button 
              onClick={() => navigate('/rma/new')}
              style={styles.primaryBtn}
            >
              + New RMA
            </button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div style={styles.viewModeContainer}>
          <span style={styles.viewModeLabel}>View:</span>
          <div style={styles.viewModeButtons}>
            <button
              onClick={() => setViewMode('all')}
              style={{
                ...styles.viewModeBtn,
                ...(viewMode === 'all' ? styles.viewModeBtnActive : {})
              }}
            >
              All RMAs
            </button>
            <button
              onClick={() => setViewMode('byGroup')}
              style={{
                ...styles.viewModeBtn,
                ...(viewMode === 'byGroup' ? styles.viewModeBtnActive : {})
              }}
            >
              By RMA Group
            </button>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {loading ? (
          <div style={styles.loading}>Loading...</div>
        ) : rmas.length === 0 ? (
          <div style={styles.empty}>
            <p>No RMAs found</p>
            {!showArchived && (
              <button 
                onClick={() => navigate('/rma/new')}
                style={styles.primaryBtn}
              >
                Create your first RMA
              </button>
            )}
          </div>
        ) : (
          <RMAView rmas={rmas} viewMode={viewMode} />
        )}
      </div>
    </div>
  );
};

const RMAView = ({ rmas, viewMode }) => {
  const navigate = useNavigate();
  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Filter based on view mode
  let displayRmas = rmas;
  if (viewMode === 'individual') {
    // Show only RMAs without a group
    displayRmas = rmas.filter(rma => !rma.group_id);
  }

  if (viewMode === 'byGroup') {
    // Group RMAs by group_id
    const grouped = {};
    const ungrouped = [];
    
    displayRmas.forEach(rma => {
      if (rma.group_id) {
        if (!grouped[rma.group_id]) {
          grouped[rma.group_id] = [];
        }
        grouped[rma.group_id].push(rma);
      } else {
        ungrouped.push(rma);
      }
    });

    return (
      <div style={{ width: '100%' }}>
        {/* Display groups */}
        {Object.entries(grouped).map(([groupId, groupRmas]) => {
          const isExpanded = expandedGroups[groupId] !== false; // Default to expanded
          
          return (
            <div key={`group-${groupId}`} style={styles.groupContainer}>
              <div style={styles.groupHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => toggleGroup(groupId)}
                    style={styles.toggleBtn}
                    aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                  <h3 style={styles.groupTitle}>
                    📦 RMA Group #{groupId}
                    <span style={styles.groupCount}>({groupRmas.length} devices)</span>
                  </h3>
                </div>
                <button
                  onClick={() => navigate(`/group/${groupId}`)}
                  style={styles.viewGroupBtn}
                >
                  View All
                </button>
              </div>
              {isExpanded && (
                <div style={styles.grid}>
                  {groupRmas.map((rma) => (
                    <RMACard key={rma.id} rma={rma} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        
        {/* Display ungrouped RMAs */}
        {ungrouped.length > 0 && (
          <div style={{ ...styles.groupContainer, marginTop: Object.keys(grouped).length > 0 ? '0' : '0', marginBottom: '24px' }}>
            <h3 style={{ ...styles.groupTitle, marginBottom: '20px' }}>Individual RMAs</h3>
            <div style={styles.grid}>
              {ungrouped.map((rma) => (
                <RMACard key={rma.id} rma={rma} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default: show all in grid
  return (
    <div style={styles.grid}>
      {displayRmas.map((rma) => (
        <RMACard key={rma.id} rma={rma} />
      ))}
    </div>
  );
};

const RMACard = ({ rma }) => {
  const navigate = useNavigate();
  
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

  return (
    <div 
      style={styles.card}
      onClick={() => navigate(`/rma/${rma.id}`)}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      }}
    >
      <div style={styles.cardHeader}>
        <span style={styles.rmaNumber}>RMA #{rma.rma_number}</span>
        <span 
          style={{
            ...styles.badge,
            backgroundColor: getStateColor(rma.state),
          }}
        >
          {rma.state}
        </span>
      </div>
      <div style={styles.cardBody}>
        {rma.group_id && (
          <div style={styles.cardRow}>
            <span style={styles.groupBadge}>
              📦 Group #{rma.group_id}
            </span>
          </div>
        )}
        <div style={styles.cardRow}>
          <strong>Serial:</strong> {rma.serial_number}
        </div>
        <div style={styles.cardRow}>
          <strong>Priority:</strong> {rma.priority}
        </div>
        <div style={styles.cardRow}>
          <strong>Created:</strong> {new Date(rma.created_at).toLocaleDateString()}
        </div>
        {rma.is_archived && (
          <div style={styles.cardRow}>
            <strong>
              {rma.state === 'COMPLETED' ? 'Completed:' : 'Closed:'}
            </strong>{' '}
            {new Date(rma.updated_at).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    width: '100%',
    margin: 0,
    padding: 0,
  },
  header: {
    backgroundColor: 'white',
    padding: '20px 60px',
    borderBottom: '1px solid #ddd',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerRight: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  adminBtn: {
    padding: '8px 16px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  profileBtn: {
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  username: {
    fontSize: '14px',
    color: '#666',
  },
  logoutBtn: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  content: {
    padding: '32px 60px 60px',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '15px',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '10px 20px',
    backgroundColor: 'white',
    color: '#333',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  primaryBtn: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  error: {
    backgroundColor: '#fee',
    color: '#c33',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 40px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
    width: '100%',
    alignItems: 'start',
  },
  card: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #eee',
  },
  rmaNumber: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    color: 'white',
    fontWeight: '500',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  cardRow: {
    fontSize: '14px',
    color: '#666',
  },
  groupBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },
  viewModeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    marginBottom: '32px',
    padding: '18px 24px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
  },
  viewModeLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
  },
  viewModeButtons: {
    display: 'flex',
    gap: '10px',
  },
  viewModeBtn: {
    padding: '8px 16px',
    backgroundColor: 'white',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  viewModeBtnActive: {
    backgroundColor: '#007bff',
    color: 'white',
    borderColor: '#007bff',
    fontWeight: '500',
  },
  groupContainer: {
    marginBottom: '48px',
    width: '100%',
  },
  groupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '18px 24px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    borderLeft: '4px solid #007bff',
  },
  groupTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  groupCount: {
    fontSize: '14px',
    fontWeight: '400',
    color: '#666',
  },
  viewGroupBtn: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  toggleBtn: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    color: '#007bff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '36px',
  },
};

export default Dashboard;
