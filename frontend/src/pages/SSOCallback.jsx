import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SSOCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUserFromSSO } = useAuth();
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const handleCallback = async () => {
      // Debug: log all URL parameters
      console.log('SSO Callback URL params:', {
        error: searchParams.get('error'),
        message: searchParams.get('message'),
        access: searchParams.get('access') ? 'present' : 'missing',
        refresh: searchParams.get('refresh') ? 'present' : 'missing',
        allParams: Array.from(searchParams.entries())
      });
      
      // Check for error from provider
      const errorParam = searchParams.get('error');
      const messageParam = searchParams.get('message');
      
      if (errorParam) {
        if (errorParam === 'pending_approval') {
          setError('Your account has been created but is pending admin approval. Please contact your RMAinator administrator to enable your account.');
          setStatus('Account Pending Approval');
          setTimeout(() => navigate('/login'), 8000);
        } else {
          setError(messageParam || `SSO authentication failed: ${errorParam}`);
          setStatus('Authentication failed');
          setTimeout(() => navigate('/login'), 3000);
        }
        return;
      }

      // Check if we got JWT tokens from the backend
      const accessToken = searchParams.get('access');
      const refreshToken = searchParams.get('refresh');
      
      if (accessToken && refreshToken) {
        try {
          setStatus('Completing authentication...');
          
          // Fetch user data using the access token
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const response = await fetch(`${apiUrl}/api/auth/me/`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          });

          if (response.ok) {
            const userData = await response.json();
            // Store tokens and user data
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            localStorage.setItem('user', JSON.stringify(userData));
            
            // Update AuthContext immediately so user doesn't need to sign in twice
            setUserFromSSO(userData);
            
            setStatus('Success! Redirecting...');
            setTimeout(() => navigate('/dashboard', { replace: true }), 500);
          } else if (response.status === 403) {
            // Handle 403 - account not verified
            const errorData = await response.json().catch(() => ({}));
            setError(errorData.error || 'Your account is pending admin approval. Please contact your RMAinator administrator to enable your account.');
            setStatus('Account Pending Approval');
            setTimeout(() => navigate('/login'), 8000);
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to fetch user data');
          }
        } catch (err) {
          console.error('SSO callback error:', err);
          setError('Failed to complete authentication. Please try again.');
          setStatus('Authentication failed');
          setTimeout(() => navigate('/login'), 3000);
        }
      } else {
        setError('No authentication data received');
        setStatus('Authentication failed');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>SSO Authentication</h2>
        {!error && (
          <div style={styles.status}>
            <div style={styles.spinner}></div>
            <p style={styles.statusText}>{status}</p>
          </div>
        )}
        {error && (
          <div>
            <div style={styles.statusIcon}>⚠️</div>
            <h3 style={styles.statusTitle}>{status}</h3>
            <div style={styles.error}>{error}</div>
            <p style={styles.redirectMessage}>Redirecting to login page...</p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
    textAlign: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '30px',
  },
  status: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  statusText: {
    fontSize: '16px',
    color: '#666',
  },
  error: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#fff3cd',
    color: '#856404',
    borderRadius: '4px',
    fontSize: '15px',
    lineHeight: '1.6',
    border: '1px solid #ffeaa7',
  },
  statusIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  statusTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '12px',
  },
  redirectMessage: {
    marginTop: '16px',
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic',
  },
};

// Add keyframes animation via a style tag
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}

export default SSOCallback;
