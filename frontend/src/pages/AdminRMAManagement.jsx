import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { rmaAPI } from '../services/api';

const AdminRMAManagement = () => {
  const [rmas, setRmas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    state: '',
    priority: '',
  });
  
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    loadRMAs();
  }, [isAdmin]);

  const loadRMAs = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await rmaAPI.list({ archived: false });
      setRmas(response.data.results || response.data);
    } catch (err) {
      setError('Failed to load RMAs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {};
      if (searchQuery) params.q = searchQuery;
      if (filters.state) params.state = filters.state;
      if (filters.priority) params.priority = filters.priority;
      
      const response = await rmaAPI.search(params);
      setRmas(response.data.results || response.data);
    } catch (err) {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilters({ state: '', priority: '' });
    loadRMAs();
  };

  if (!isAdmin) {
    return null;
  }

  const states = [
    'SUBMITTED', 'APPROVED', 'REJECTED', 'RECEIVED',
    'DIAGNOSED', 'REPAIRED', 'REPLACED', 'SHIPPED', 'COMPLETED'
  ];
  
  const priorities = ['LOW', 'NORMAL', 'HIGH'];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Admin - RMA Management</h1>
        <div style={styles.headerRight}>
          <button onClick={() => navigate('/admin')} style={styles.navBtn}>
            Dashboard
          </button>
          <button onClick={() => navigate('/admin/users')} style={styles.navBtn}>
            Manage Users
          </button>
          <span style={styles.username}>{user?.username}</span>
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={styles.content}>
        {/* Search and Filters */}
        <div style={styles.searchSection}>
          <div style={styles.searchBar}>
            <input
              type="text"
              placeholder="Search by RMA #, Serial #, Owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              style={styles.searchInput}
            />
            <button onClick={handleSearch} style={styles.searchBtn}>
              Search
            </button>
          </div>

          <div style={styles.filters}>
            <select
              value={filters.state}
              onChange={(e) => setFilters({ ...filters, state: e.target.value })}
              style={styles.select}
            >
              <option value="">All States</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>

            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              style={styles.select}
            >
              <option value="">All Priorities</option>
              {priorities.map(priority => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>

            <button onClick={handleClearFilters} style={styles.clearBtn}>
              Clear Filters
            </button>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* RMA Table */}
        <div style={styles.tableSection}>
          <div style={styles.tableHeader}>
            <h2>All RMAs ({rmas.length})</h2>
          </div>

          {loading ? (
            <div style={styles.loading}>Loading...</div>
          ) : rmas.length === 0 ? (
            <div style={styles.empty}>No RMAs found</div>
          ) : (
            <div style={styles.table}>
              <div style={styles.tableHeaderRow}>
                <div>RMA #</div>
                <div>Serial Number</div>
                <div>Owner</div>
                <div>State</div>
                <div>Priority</div>
                <div>Created</div>
                <div>Actions</div>
              </div>
              
              {rmas.map((rma) => (
                <div key={rma.id} style={styles.tableRow}>
                  <div style={styles.rmaNum}>#{rma.rma_number}</div>
                  <div>{rma.serial_number}</div>
                  <div>{rma.owner?.username || 'N/A'}</div>
                  <div>
                    <span style={getStateBadgeStyle(rma.state)}>
                      {rma.state}
                    </span>
                  </div>
                  <div>
                    <span style={getPriorityBadgeStyle(rma.priority)}>
                      {rma.priority}
                    </span>
                  </div>
                  <div>{new Date(rma.created_at).toLocaleDateString()}</div>
                  <div>
                    <button
                      onClick={() => navigate(`/rma/${rma.id}`)}
                      style={styles.viewBtn}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const getStateBadgeStyle = (state) => {
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

  return {
    ...styles.badge,
    backgroundColor: colors[state] || '#6c757d',
  };
};

const getPriorityBadgeStyle = (priority) => {
  const colors = {
    LOW: '#28a745',
    NORMAL: '#007bff',
    HIGH: '#dc3545',
  };

  return {
    ...styles.badge,
    backgroundColor: colors[priority] || '#007bff',
  };
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: '20px 40px',
    borderBottom: '1px solid #ddd',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
  },
  navBtn: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
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
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  searchSection: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  searchBar: {
    display: 'flex',
    gap: '10px',
    marginBottom: '16px',
  },
  searchInput: {
    flex: 1,
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  searchBtn: {
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  filters: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  select: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
  },
  clearBtn: {
    padding: '10px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
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
    padding: '40px',
    color: '#666',
  },
  tableSection: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  tableHeader: {
    marginBottom: '20px',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
  },
  tableHeaderRow: {
    display: 'grid',
    gridTemplateColumns: '80px 150px 120px 120px 100px 120px 100px',
    gap: '16px',
    padding: '12px 16px',
    backgroundColor: '#f8f9fa',
    fontWeight: 'bold',
    fontSize: '14px',
    color: '#333',
    borderRadius: '4px',
    marginBottom: '8px',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '80px 150px 120px 120px 100px 120px 100px',
    gap: '16px',
    padding: '12px 16px',
    borderBottom: '1px solid #eee',
    alignItems: 'center',
    fontSize: '14px',
  },
  rmaNum: {
    fontWeight: 'bold',
    color: '#007bff',
  },
  badge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    color: 'white',
    textAlign: 'center',
    display: 'inline-block',
  },
  viewBtn: {
    padding: '6px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
};

export default AdminRMAManagement;
