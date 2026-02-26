import { useState, useEffect, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { startRegistration } from '@simplewebauthn/browser';
import type { ProfileFormData, ProfileUpdateData, WebAuthnCredential } from '../types';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<ProfileFormData>({
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    current_password: '',
    new_password: '',
    new_password2: '',
  });
  
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  // TOTP state
  const [totpEnabled, setTotpEnabled] = useState<boolean>(false);
  const [showTotpSetup, setShowTotpSetup] = useState<boolean>(false);
  const [showTotpDisable, setShowTotpDisable] = useState<boolean>(false);
  const [totpQrCode, setTotpQrCode] = useState<string>('');
  const [_totpSecret, setTotpSecret] = useState<string>('');
  const [totpToken, setTotpToken] = useState<string>('');
  const [totpDisableToken, setTotpDisableToken] = useState<string>('');
  const [totpLoading, setTotpLoading] = useState<boolean>(false);
  
  // WebAuthn state
  const [webauthnCredentials, setWebauthnCredentials] = useState<WebAuthnCredential[]>([]);
  const [showWebauthnAdd, setShowWebauthnAdd] = useState<boolean>(false);
  const [webauthnName, setWebauthnName] = useState<string>('');
  const [webauthnLoading, setWebauthnLoading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setMessage('');
    setError('');
  };

  // Fetch TOTP and WebAuthn status on mount
  useEffect(() => {
    const fetchAuthMethods = async (): Promise<void> => {
      try {
        const apiUrl = import.meta.env.VITE_AUTHINATOR_URL || 'http://localhost:8001';
        const token = localStorage.getItem('accessToken');
        
        // Fetch TOTP status
        const totpResponse = await fetch(`${apiUrl}/api/auth/totp/status/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (totpResponse.ok) {
          const totpData = await totpResponse.json();
          setTotpEnabled(totpData.enabled);
        }
        
        // Fetch WebAuthn credentials
        const webauthnResponse = await fetch(`${apiUrl}/api/auth/webauthn/credentials/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (webauthnResponse.ok) {
          const data = await webauthnResponse.json();
          setWebauthnCredentials(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to fetch auth methods:', err);
      }
    };
    
    fetchAuthMethods();
  }, []);
  
  const handleTotpSetup = async (): Promise<void> => {
    console.log('TOTP Setup button clicked');
    setTotpLoading(true);
    setError('');
    setMessage('');
    
    try {
      const apiUrl = import.meta.env.VITE_AUTHINATOR_URL || 'http://localhost:8001';
      const token = localStorage.getItem('accessToken');
      
      console.log('Fetching TOTP setup from:', `${apiUrl}/api/auth/totp/setup/`);
      
      const response = await fetch(`${apiUrl}/api/auth/totp/setup/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('TOTP setup response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('TOTP setup data received');
        setTotpQrCode(data.qr_code);
        setTotpSecret(data.secret);
        setShowTotpSetup(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('TOTP setup failed:', errorData);
        setError(errorData.error || 'Failed to initialize TOTP setup');
      }
    } catch (err: unknown) {
      console.error('TOTP setup error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(`Failed to initialize TOTP setup: ${errMsg}`);
    }
    
    setTotpLoading(false);
  };
  
  const handleTotpConfirm = async (): Promise<void> => {
    if (!totpToken) {
      setError('Please enter the 6-digit code from your authenticator app');
      return;
    }
    
    setTotpLoading(true);
    setError('');
    
    try {
      const apiUrl = import.meta.env.VITE_AUTHINATOR_URL || 'http://localhost:8001';
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${apiUrl}/api/auth/totp/confirm/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: totpToken }),
      });
      
      if (response.ok) {
        setTotpEnabled(true);
        setShowTotpSetup(false);
        setMessage('Two-factor authentication enabled successfully');
        setTotpToken('');
      } else {
        const data = await response.json();
        setError(data.error || 'Invalid verification code');
      }
    } catch {
      setError('Failed to verify TOTP code');
    }
    
    setTotpLoading(false);
  };
  
  const handleTotpDisable = async (): Promise<void> => {
    if (!totpDisableToken) {
      setError('Please enter the 6-digit code from your authenticator app');
      return;
    }
    
    setTotpLoading(true);
    setError('');
    setMessage('');
    
    try {
      const apiUrl = import.meta.env.VITE_AUTHINATOR_URL || 'http://localhost:8001';
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${apiUrl}/api/auth/totp/disable/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: totpDisableToken }),
      });
      
      if (response.ok) {
        setTotpEnabled(false);
        setShowTotpDisable(false);
        setMessage('Two-factor authentication disabled successfully');
        setTotpDisableToken('');
      } else {
        const data = await response.json();
        setError(data.error || 'Invalid verification code');
      }
    } catch (err) {
      console.error('TOTP disable error:', err);
      setError('Failed to disable TOTP');
    }
    
    setTotpLoading(false);
  };
  
  const handleWebauthnAdd = async (): Promise<void> => {
    if (!webauthnName.trim()) {
      setError('Please enter a name for this security key');
      return;
    }
    
    console.log('WebAuthn: Starting registration for key:', webauthnName);
    setWebauthnLoading(true);
    setError('');
    setMessage('');
    
    try {
      const apiUrl = import.meta.env.VITE_AUTHINATOR_URL || 'http://localhost:8001';
      const token = localStorage.getItem('accessToken');
      
      console.log('WebAuthn: Fetching registration options...');
      // Start registration
      const beginResponse = await fetch(`${apiUrl}/api/auth/webauthn/register/begin/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: webauthnName }),
      });
      
      console.log('WebAuthn: Begin response status:', beginResponse.status);
      
      if (!beginResponse.ok) {
        const errorData = await beginResponse.json().catch(() => ({}));
        console.error('WebAuthn: Begin registration failed:', errorData);
        throw new Error(errorData.error || 'Failed to begin registration');
      }
      
      const options = await beginResponse.json();
      console.log('WebAuthn: Got registration options:', options);
      
      // Parse the options if it's a string
      const parsedOptions = typeof options.options === 'string' 
        ? JSON.parse(options.options) 
        : options.options || options;
      
      console.log('WebAuthn: Parsed options:', parsedOptions);
      console.log('WebAuthn: Starting browser registration...');
      
      // Use WebAuthn API
      const credential = await startRegistration(parsedOptions);
      console.log('WebAuthn: Browser registration completed');
      
      console.log('WebAuthn: Completing registration on server...');
      // Complete registration
      const completeResponse = await fetch(`${apiUrl}/api/auth/webauthn/register/complete/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credential),
      });
      
      console.log('WebAuthn: Complete response status:', completeResponse.status);
      
      if (!completeResponse.ok) {
        const errorData = await completeResponse.json().catch(() => ({}));
        console.error('WebAuthn: Complete registration failed:', errorData);
        throw new Error(errorData.error || 'Failed to complete registration');
      }
      
      // Refresh credentials list
      const listResponse = await fetch(`${apiUrl}/api/auth/webauthn/credentials/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (listResponse.ok) {
        const data = await listResponse.json();
        setWebauthnCredentials(data);
      }
      
      console.log('WebAuthn: Registration successful!');
      setShowWebauthnAdd(false);
      setWebauthnName('');
      setMessage('Security key added successfully');
    } catch (err: unknown) {
      console.error('WebAuthn error:', err);
      const errMsg = err instanceof Error ? err.message : 'Failed to add security key';
      setError(errMsg);
    }
    
    setWebauthnLoading(false);
  };
  
  const handleWebauthnDelete = async (credentialId: number): Promise<void> => {
    if (!confirm('Are you sure you want to remove this security key?')) {
      return;
    }
    
    try {
      const apiUrl = import.meta.env.VITE_AUTHINATOR_URL || 'http://localhost:8001';
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`${apiUrl}/api/auth/webauthn/credentials/${credentialId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        setWebauthnCredentials(webauthnCredentials.filter(c => c.id !== credentialId));
        setMessage('Security key removed successfully');
      } else {
        setError('Failed to remove security key');
      }
    } catch {
      setError('Failed to remove security key');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    // Build update data
    const updateData: ProfileUpdateData = {
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

            <div style={styles.divider}></div>

            {/* TOTP/2FA Section */}
            <div style={styles.authSection}>
              <div style={styles.authHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>Two-Factor Authentication</h2>
                  <p style={styles.sectionDescription}>
                    Add an extra layer of security with authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                </div>
                {!totpEnabled && !showTotpSetup && (
                  <button
                    type="button"
                    onClick={handleTotpSetup}
                    style={styles.enableBtn}
                    disabled={totpLoading}
                  >
                    {totpLoading ? 'Loading...' : 'Enable 2FA'}
                  </button>
                )}
                {totpEnabled && !showTotpDisable && (
                  <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
                    <span style={styles.enabledBadge}>✓ Enabled</span>
                    <button
                      type="button"
                      onClick={() => setShowTotpDisable(true)}
                      style={styles.disableBtn}
                    >
                      Disable 2FA
                    </button>
                  </div>
                )}
              </div>

              {showTotpSetup && (
                <div style={styles.setupBox}>
                  <h3 style={styles.setupTitle}>Scan QR Code</h3>
                  <p style={styles.setupDescription}>
                    Scan this QR code with your authenticator app, then enter the 6-digit code to verify.
                  </p>
                  {totpQrCode && (
                    <div style={styles.qrCodeContainer}>
                      <img src={totpQrCode} alt="TOTP QR Code" style={styles.qrCode} />
                    </div>
                  )}
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Verification Code</label>
                    <input
                      type="text"
                      value={totpToken}
                      onChange={(e) => setTotpToken(e.target.value)}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.setupActions}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTotpSetup(false);
                        setTotpToken('');
                      }}
                      style={styles.cancelBtn}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleTotpConfirm}
                      style={styles.confirmBtn}
                      disabled={totpLoading}
                    >
                      {totpLoading ? 'Verifying...' : 'Verify & Enable'}
                    </button>
                  </div>
                </div>
              )}
              
              {showTotpDisable && (
                <div style={styles.setupBox}>
                  <h3 style={styles.setupTitle}>Disable Two-Factor Authentication</h3>
                  <p style={styles.setupDescription}>
                    Enter a 6-digit code from your authenticator app to confirm disabling 2FA.
                  </p>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Verification Code</label>
                    <input
                      type="text"
                      value={totpDisableToken}
                      onChange={(e) => setTotpDisableToken(e.target.value)}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.setupActions}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTotpDisable(false);
                        setTotpDisableToken('');
                      }}
                      style={styles.cancelBtn}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleTotpDisable}
                      style={{...styles.deleteBtn, padding: '12px 24px'}}
                      disabled={totpLoading}
                    >
                      {totpLoading ? 'Disabling...' : 'Disable 2FA'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.divider}></div>

            {/* WebAuthn Section */}
            <div style={styles.authSection}>
              <div style={styles.authHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>Security Keys (WebAuthn)</h2>
                  <p style={styles.sectionDescription}>
                    Use hardware security keys or biometric authentication for passwordless login
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWebauthnAdd(true)}
                  style={styles.enableBtn}
                  disabled={showWebauthnAdd}
                >
                  Add Security Key
                </button>
              </div>

              {webauthnCredentials.length > 0 && (
                <div style={styles.credentialsList}>
                  {webauthnCredentials.map((cred) => (
                    <div key={cred.id} style={styles.credentialItem}>
                      <div>
                        <div style={styles.credentialName}>🔑 {cred.name}</div>
                        <div style={styles.credentialDate}>
                          Added: {new Date(cred.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleWebauthnDelete(cred.id)}
                        style={styles.deleteBtn}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showWebauthnAdd && (
                <div style={styles.setupBox}>
                  <h3 style={styles.setupTitle}>Add Security Key</h3>
                  <p style={styles.setupDescription}>
                    Give your security key a name, then follow your browser's prompts.
                  </p>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Security Key Name</label>
                    <input
                      type="text"
                      value={webauthnName}
                      onChange={(e) => setWebauthnName(e.target.value)}
                      placeholder="e.g., YubiKey, Touch ID"
                      style={styles.input}
                    />
                  </div>
                  <div style={styles.setupActions}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowWebauthnAdd(false);
                        setWebauthnName('');
                      }}
                      style={styles.cancelBtn}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleWebauthnAdd}
                      style={styles.confirmBtn}
                      disabled={webauthnLoading}
                    >
                      {webauthnLoading ? 'Adding...' : 'Add Key'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.divider}></div>

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

const styles: Record<string, CSSProperties> = {
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
  authSection: {
    marginTop: '8px',
  },
  authHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  sectionDescription: {
    fontSize: '14px',
    color: '#666',
    marginTop: '8px',
    marginBottom: '0',
  },
  enableBtn: {
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  disableBtn: {
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  enabledBadge: {
    padding: '8px 16px',
    backgroundColor: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
  },
  setupBox: {
    backgroundColor: '#f8f9fa',
    padding: '20px',
    borderRadius: '6px',
    marginTop: '16px',
  },
  setupTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px',
  },
  setupDescription: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '16px',
  },
  qrCodeContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '4px',
    marginBottom: '16px',
  },
  qrCode: {
    maxWidth: '200px',
    height: 'auto',
  },
  setupActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '16px',
  },
  confirmBtn: {
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  credentialsList: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  credentialItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '6px',
    border: '1px solid #e0e0e0',
  },
  credentialName: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#333',
    marginBottom: '4px',
  },
  credentialDate: {
    fontSize: '12px',
    color: '#999',
  },
  deleteBtn: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
};

export default Profile;
