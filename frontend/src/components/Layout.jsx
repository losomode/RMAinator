import { redirectToServices, handleLogout } from '../utils/auth';

const Layout = ({ children }) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top navigation bar */}
      <div style={{
        backgroundColor: '#1a1a2e',
        color: 'white',
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h1 style={{ margin: 0, fontSize: '20px' }}>🔧 RMAinator</h1>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={redirectToServices}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4a4a6a',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ← Back to Services
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#d32f2f',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
};

export default Layout;
