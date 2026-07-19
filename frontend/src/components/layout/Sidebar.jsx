import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  BarChart2,
  MessageSquare,
  Settings,
  Users,
  CreditCard,
  LogOut,
  X,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/dashboard',               icon: LayoutDashboard, label: 'Overview',      end: true },
  { to: '/dashboard/documents',     icon: FileText,        label: 'Documents'              },
  { to: '/dashboard/analytics',     icon: BarChart2,       label: 'Analytics'              },
  { to: '/dashboard/conversations', icon: MessageSquare,   label: 'Conversations'          },
  { to: '/dashboard/team',          icon: Users,           label: 'Team'                   },
  { to: '/dashboard/settings',      icon: Settings,        label: 'Settings'               },
  { to: '/dashboard/subscription',  icon: CreditCard,      label: 'Subscription'           },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const initial = user?.name?.[0]?.toUpperCase() ?? '?';

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-gray-200 shadow-lg',
          'transition-transform duration-200 ease-in-out',
          'lg:relative lg:shadow-none lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-gray-100">
          <Link to="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 shadow-sm shadow-brand-500/30">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 tracking-tight">
              Help<span className="text-brand-500">Genie</span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:text-gray-600 transition-colors lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Workspace pill */}
        {user?.company?.name && (
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
              Workspace
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-gray-700">
              {user.company.name}
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      isActive ? 'text-brand-500' : 'text-gray-400'
                    )}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="shrink-0 border-t border-gray-100 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="truncate text-xs capitalize text-gray-400">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="shrink-0 rounded-md p-1 text-gray-400 hover:text-red-500 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
