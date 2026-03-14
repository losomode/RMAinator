import { Link, useLocation } from 'react-router-dom';

const TOOLS = [
  { path: '/admin', label: '📊 Dashboard' },
  { path: '/admin/manage', label: '📋 Manage RMAs' },
  { path: '/admin/stale-config', label: '⚙️ Stale Config' },
] as const;

/** Sub-navigation bar for the RMA admin tool pages. */
export function AdminToolsNav(): React.JSX.Element {
  const { pathname } = useLocation();

  return (
    <div className="mb-6 rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-lg font-bold text-gray-900">Admin Tools</h2>
      <div className="grid grid-cols-3 gap-3">
        {TOOLS.map((tool) => (
          <Link
            key={tool.path}
            to={tool.path}
            className={`rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors ${
              pathname === tool.path
                ? 'bg-blue-700 text-white shadow-md'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {tool.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
