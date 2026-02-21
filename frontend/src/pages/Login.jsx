import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  
  // Add hover effects CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .sso-button-google:hover:not(:disabled) {
        background-color: #f8f9fa !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.12) !important;
      }
      .sso-button-microsoft:hover:not(:disabled) {
        background-color: #f3f3f3 !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.12) !important;
      }
      .sso-button-google:active:not(:disabled) {
        background-color: #eeeeee !important;
      }
      .sso-button-microsoft:active:not(:disabled) {
        background-color: #e5e5e5 !important;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleSSOLogin = (provider) => {
    // Redirect to SSO provider
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    window.location.href = `${apiUrl}/api/auth/${provider}/login/`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>RMAinator</h1>
        <h2 style={styles.subtitle}>Login</h2>
        
        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              required
              disabled={loading}
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            style={styles.button}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        {/* SSO buttons - uncomment after configuring providers in backend/.env */}
        {/* See AUTH_SETUP.md for configuration instructions */}
        
        <div style={styles.divider}>
          <div style={styles.dividerLine}></div>
          <span style={styles.dividerText}>OR</span>
          <div style={styles.dividerLine}></div>
        </div>
        
        <div style={styles.ssoButtons}>
          <button
            onClick={() => handleSSOLogin('google')}
            className="sso-button-google"
            style={{...styles.ssoButton, ...styles.googleButton}}
            disabled={loading}
          >
            <svg style={styles.ssoIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
          
          <button
            onClick={() => handleSSOLogin('microsoft')}
            className="sso-button-microsoft"
            style={{...styles.ssoButton, ...styles.microsoftButton}}
            disabled={loading}
          >
            <svg style={styles.ssoIcon} viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
              <path fill="#f25022" d="M0 0h11v11H0z"/>
              <path fill="#00a4ef" d="M12 0h11v11H12z"/>
              <path fill="#7fba00" d="M0 12h11v11H0z"/>
              <path fill="#ffb900" d="M12 12h11v11H12z"/>
            </svg>
            Sign in with Microsoft
          </button>
          {/*
          <button
            onClick={() => handleSSOLogin('auth0')}
            style={{...styles.ssoButton, ...styles.auth0Button}}
            disabled={loading}
          >
            <span style={styles.ssoIcon}>🔐</span>
            Sign in with Auth0
          </button>
          
          <button
            onClick={() => handleSSOLogin('okta')}
            style={{...styles.ssoButton, ...styles.oktaButton}}
            disabled={loading}
          >
            <span style={styles.ssoIcon}>🔐</span>
            Sign in with Okta
          </button>
          */}
        </div>
        
        
        <div style={styles.footer}>
          Don't have an account? <Link to="/register" style={styles.link}>Register</Link>
        </div>
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
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '10px',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '20px',
    color: '#666',
    marginBottom: '30px',
    textAlign: 'center',
  },
  error: {
    backgroundColor: '#fee',
    color: '#c33',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#333',
  },
  input: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  button: {
    padding: '12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '10px',
  },
  footer: {
    marginTop: '20px',
    textAlign: 'center',
    fontSize: '14px',
    color: '#666',
  },
  link: {
    color: '#007bff',
    textDecoration: 'none',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center',
    margin: '20px 0',
    position: 'relative',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#ddd',
  },
  dividerText: {
    padding: '0 10px',
    color: '#999',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: 'white',
  },
  ssoButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '20px',
  },
  ssoButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    color: '#333',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  ssoIcon: {
    width: '20px',
    height: '20px',
    marginRight: '12px',
    flexShrink: 0,
  },
  googleButton: {
    backgroundColor: '#fff',
    border: '1px solid #dadce0',
    color: '#3c4043',
    fontWeight: '500',
  },
  microsoftButton: {
    backgroundColor: '#fff',
    border: '1px solid #8c8c8c',
    color: '#5e5e5e',
    fontWeight: '600',
  },
  auth0Button: {
    borderColor: '#EB5424',
    color: '#EB5424',
  },
  oktaButton: {
    borderColor: '#007DC1',
    color: '#007DC1',
  },
};

export default Login;
