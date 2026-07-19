import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';

const TITLES = {
  '/dashboard':               'Overview',
  '/dashboard/documents':     'Documents',
  '/dashboard/analytics':     'Analytics',
  '/dashboard/conversations': 'Conversations',
  '/dashboard/team':          'Team',
  '/dashboard/settings':      'Settings',
  '/dashboard/subscription':  'Subscription',
};

export default function Topbar({ onMenuClick }) {
  const { pathname } = useLocation();

  // Match the most-specific prefix (handles nested routes like /dashboard/documents/123)
  const title =
    Object.entries(TITLES)
      .filter(([path]) => pathname === path || pathname.startsWith(path + '/'))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? 'Dashboard';

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
    </header>
  );
}
