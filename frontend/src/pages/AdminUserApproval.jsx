import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

const AdminUserApproval = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(null);
  
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    loadPendingUsers();
  }, [isAdmin]);

  const loadPendingUsers = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getPendingUsers();
      setPendingUsers(response.data.results || response.data);
    } catch (err) {
      setError('Failed to load pending users');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      setProcessing(userId);
      await authAPI.approveUser(userId, true);
      // Remove from list
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      setProcessing(null);
    } catch (err) {
      setError('Failed to approve user');
      setProcessing(null);
    }
  };

  const handleReject = async (userId) => {
    if (!confirm('Are you sure you want to reject and delete this user?')) {
      return;
    }

    try {
      setProcessing(userId);
      await authAPI.approveUser(userId, false);
      // Remove from list
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      setProcessing(null);
    } catch (err) {
      setError('Failed to reject user');
      setProcessing(null);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Admin - User Approval</h1>
        <div style={styles.headerRight}>
          <button onClick={() => navigate('/admin')} style={styles.navBtn}>
            Dashboard
          </button>
          <button onClick={() => navigate('/admin/rmas')} style={styles.navBtn}>
            Manage RMAs
          </button>
          <span style={styles.username}>{user?.username}</span>
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={styles.content}>
        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.section}>
          <h2>Pending User Approvals ({pendingUsers.length})</h2>
          
          {loading ? (
            <div style={styles.loading}>Loading...</div>
          ) : pendingUsers.length === 0 ? (
            <div style={styles.empty}>
              <p>✓ No pending user approvals</p>
              <p style={styles.emptySubtext}>All users have been reviewed.</p>
            </div>
          ) : (
            <div style={styles.userList}>
              {pendingUsers.map((pendingUser) => (
                <div key={pendingUser.id} style={styles.userCard}>
                  <div style={styles.userInfo}>
                    <div style={styles.userName}>
                      {pendingUser.first_name} {pendingUser.last_name}
                    </div>
                    <div style={styles.userDetails}>
                      <span><strong>Username:</strong> {pendingUser.username}</span>
                      <span><strong>Email:</strong> {pendingUser.email}</span>
                      <span><strong>Registered:</strong> {new Date(pendingUser.date_joined).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div style={styles.userActions}>
                    <button
                      onClick={() => handleApprove(pendingUser.id)}
                      disabled={processing === pendingUser.id}
                      style={styles.approveBtn}
                    >
                      {processing === pendingUser.id ? 'Processing...' : '✓ Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(pendingUser.id)}
                      disabled={processing === pendingUser.id}
                      style={styles.rejectBtn}
                    >
                      {processing === pendingUser.id ? 'Processing...' : '✗ Reject'}
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
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  error: {
    backgroundColor: '#fee',
    color: '#c33',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  section: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
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
  emptySubtext: {
    fontSize: '14px',
    color: '#999',
    marginTop: '8px',
  },
  userList: {
    marginTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  userCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #dee2e6',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '14px',
    color: '#666',
  },
  userActions: {
    display: 'flex',
    gap: '10px',
  },
  approveBtn: {
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  rejectBtn: {
    padding: '10px 20px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
};

export default AdminUserApproval;
