import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SSOCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    const handleCallback = async () => {
      // Check for error from provider
      const errorParam = searchParams.get('error');
      if (errorParam) {
        setError(`SSO authentication failed: ${errorParam}`);
        setStatus('Authentication failed');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // The SSO provider should have set a session cookie
      // Try to fetch the current user to see if authentication succeeded
      try {
        setStatus('Completing authentication...');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/auth/me/`, {
          credentials: 'include',
        });

        if (response.ok) {
          const userData = await response.json();
          // Store the user data
          localStorage.setItem('user', JSON.stringify(userData));
          localStorage.setItem('token', 'sso_authenticated'); // Placeholder since we're using session
          
          setStatus('Success! Redirecting...');
          setTimeout(() => navigate('/dashboard'), 500);
        } else {
          throw new Error('Failed to fetch user data');
        }
      } catch (err) {
        console.error('SSO callback error:', err);
        setError('Failed to complete authentication. Please try again.');
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
        <div style={styles.status}>
          <div style={styles.spinner}></div>
          <p style={styles.statusText}>{status}</p>
        </div>
        {error && (
          <div style={styles.error}>{error}</div>
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
    padding: '12px',
    backgroundColor: '#fee',
    color: '#c33',
    borderRadius: '4px',
    fontSize: '14px',
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
