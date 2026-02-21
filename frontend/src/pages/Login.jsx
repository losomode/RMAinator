import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

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
            style={{...styles.ssoButton, ...styles.googleButton}}
            disabled={loading}
          >
            <span style={styles.ssoIcon}>🔐</span>
            Sign in with Google
          </button>
          
          <button
            onClick={() => handleSSOLogin('microsoft')}
            style={{...styles.ssoButton, ...styles.microsoftButton}}
            disabled={loading}
          >
            <span style={styles.ssoIcon}>🔐</span>
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
    marginRight: '8px',
    fontSize: '16px',
  },
  googleButton: {
    borderColor: '#4285F4',
    color: '#4285F4',
  },
  microsoftButton: {
    borderColor: '#00A4EF',
    color: '#00A4EF',
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
