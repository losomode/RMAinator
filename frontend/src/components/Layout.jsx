import { Link, useLocation } from 'react-router-dom';
import { redirectToServices, handleLogout } from '../utils/auth';

const Layout = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/rma/new', label: 'New RMA' },
    { path: '/profile', label: 'Profile' },
    { path: '/admin', label: 'Admin', adminOnly: true },
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800">🔧 RMAinator</h1>
          <p className="text-xs text-gray-500 mt-1">RMA Tracking</p>
        </div>
        <nav className="mt-6 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-6 py-3 text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={redirectToServices}
            className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors mb-2"
          >
            ← Back to Services
          </button>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
};

export default Layout;
