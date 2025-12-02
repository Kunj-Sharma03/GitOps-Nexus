/**
 * App Layout with Navigation
 */

import type { ReactNode } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';

interface LayoutProps {
  children?: ReactNode;
}

const navItems = [
  { path: '/dashboard', label: 'Repositories', icon: '📁' },
  { path: '/jobs', label: 'CI/CD', icon: '⚡' },
  { path: '/sandboxes', label: 'Sandboxes', icon: '📦' },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    window.location.href = '/';
  };

  return (
    <div className="h-screen flex flex-col text-white overflow-hidden">
      {/* Top Navigation Bar */}
      <nav className="shrink-0 border-b border-white/10 bg-black/40 backdrop-blur-xl z-50">
        <div className="px-4 md:px-6">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-cyan-500 flex items-center justify-center font-black text-black text-sm">
                G
              </div>
              <span className="hidden sm:block text-sm font-bold tracking-wide">
                GitOps <span className="text-green-400">Nexus</span>
              </span>
            </div>

            {/* Nav Links - Desktop */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`
                    px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-medium transition-all duration-200
                    ${location.pathname === item.path
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-white/40 hover:text-white/80 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden border-t border-white/5 px-2 py-2 flex gap-1 overflow-x-auto">
          {navItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`
                flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-medium transition-all
                ${location.pathname === item.path
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'text-white/50'
                }
              `}
            >
              <span className="mr-1.5">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {children || <Outlet />}
      </main>
    </div>
  );
}
