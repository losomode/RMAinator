import { useNavigate, useLocation } from 'react-router-dom';
import { type CSSProperties } from 'react';

const AdminToolsNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tools = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/rmas', label: 'Manage RMAs', icon: '📋' },
    { path: '/admin/config', label: 'Stale Config', icon: '⚙️' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Admin Tools</h2>
      <div style={styles.buttonGrid}>
        {tools.map((tool) => (
          <button
            key={tool.path}
            onClick={() => navigate(tool.path)}
            style={{
              ...styles.button,
              ...(isActive(tool.path) ? styles.buttonActive : {}),
            }}
          >
            {tool.icon} {tool.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  container: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    marginBottom: '30px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#333',
  },
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
  },
  button: {
    padding: '12px 16px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
    textAlign: 'center',
  },
  buttonActive: {
    backgroundColor: '#0056b3',
    boxShadow: '0 0 0 3px rgba(0,123,255,0.3)',
  },
};

export default AdminToolsNav;
