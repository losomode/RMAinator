import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    current_password: '',
    new_password: '',
    new_password2: '',
  });
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setMessage('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    // Build update data
    const updateData = {
      email: formData.email,
      first_name: formData.first_name,
      last_name: formData.last_name,
    };

    // Add password fields if changing password
    if (isChangingPassword) {
      if (!formData.current_password || !formData.new_password || !formData.new_password2) {
        setError('All password fields are required when changing password');
        setLoading(false);
        return;
      }
      
      if (formData.new_password !== formData.new_password2) {
        setError('New passwords do not match');
        setLoading(false);
        return;
      }

      updateData.current_password = formData.current_password;
      updateData.new_password = formData.new_password;
      updateData.new_password2 = formData.new_password2;
    }

    const result = await updateProfile(updateData);
    setLoading(false);

    if (result.success) {
      setMessage(result.message || 'Profile updated successfully');
      // Clear password fields
      setFormData({
        ...formData,
        current_password: '',
        new_password: '',
        new_password2: '',
      });
      setIsChangingPassword(false);
    } else {
      // Handle error object or string
      if (typeof result.error === 'object') {
        const errorMessages = Object.entries(result.error)
          .map(([field, messages]) => {
            const msg = Array.isArray(messages) ? messages.join(', ') : messages;
            return `${field}: ${msg}`;
          })
          .join('; ');
        setError(errorMessages);
      } else {
        setError(result.error || 'Failed to update profile');
      }
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>
          ← Back to Dashboard
        </button>
      </div>

      <div style={styles.content}>
        <div style={styles.card}>
          <h1 style={styles.title}>Profile Settings</h1>

          <div style={styles.infoSection}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Username:</span>
              <span style={styles.infoValue}>{user?.username}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Role:</span>
              <span style={styles.infoValue}>{user?.role}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Member Since:</span>
              <span style={styles.infoValue}>
                {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <h2 style={styles.sectionTitle}>Account Information</h2>

            {message && <div style={styles.success}>{message}</div>}
            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.formGroup}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.divider}></div>

            <div style={styles.passwordSection}>
              <div style={styles.passwordHeader}>
                <h2 style={styles.sectionTitle}>Password</h2>
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(!isChangingPassword)}
                  style={styles.togglePasswordBtn}
                >
                  {isChangingPassword ? 'Cancel Password Change' : 'Change Password'}
                </button>
              </div>

              {isChangingPassword && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Current Password</label>
                    <input
                      type="password"
                      name="current_password"
                      value={formData.current_password}
                      onChange={handleChange}
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formRow}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>New Password</label>
                      <input
                        type="password"
                        name="new_password"
                        value={formData.new_password}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Confirm New Password</label>
                      <input
                        type="password"
                        name="new_password2"
                        value={formData.new_password2}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={styles.actions}>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                style={styles.cancelBtn}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={styles.submitBtn}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
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
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '24px',
  },
  infoSection: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '6px',
    marginBottom: '32px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #e0e0e0',
  },
  infoLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#666',
  },
  infoValue: {
    fontSize: '14px',
    color: '#333',
    fontWeight: '500',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
  },
  formRow: {
    display: 'flex',
    gap: '20px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#555',
  },
  input: {
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    outline: 'none',
  },
  divider: {
    height: '1px',
    backgroundColor: '#e0e0e0',
    margin: '16px 0',
  },
  passwordSection: {
    marginTop: '8px',
  },
  passwordHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  togglePasswordBtn: {
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
  cancelBtn: {
    padding: '12px 24px',
    backgroundColor: 'white',
    color: '#333',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  submitBtn: {
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  success: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: '12px',
    borderRadius: '4px',
    border: '1px solid #c3e6cb',
    marginBottom: '16px',
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '12px',
    borderRadius: '4px',
    border: '1px solid #f5c6cb',
    marginBottom: '16px',
  },
};

export default Profile;
