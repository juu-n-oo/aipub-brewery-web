import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileCode2, Hammer, Home, Globe, Bell, User, BarChart3, PanelLeftClose, PanelLeft, AlertCircle, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from '@/hooks/useAuthContext';
import { Button } from '@/components/ui/Button';

function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  const labels: Record<string, string> = {
    dockerfiles: 'Dockerfiles',
    builds: 'Builds',
    new: 'Create',
    edit: 'Edit',
  };

  return (
    <nav className="flex items-center gap-1.5 text-base text-text-secondary">
      <NavLink to="/" className="hover:text-text-primary transition-colors">
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </NavLink>
      {segments.map((seg, i) => {
        const label = labels[seg] || seg;
        const isLast = i === segments.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            <span className="text-text-muted">&gt;</span>
            {isLast ? (
              <span className="text-text-primary">{label}</span>
            ) : (
              <NavLink
                to={'/' + segments.slice(0, i + 1).join('/')}
                className="hover:text-text-primary transition-colors"
              >
                {label}
              </NavLink>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function NoProjectGuard({ children }: { children: React.ReactNode }) {
  const { projects, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const protectedPaths = ['/dockerfiles', '/builds'];
  const isProtected = protectedPaths.some((p) => location.pathname.startsWith(p));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-text-secondary">로딩 중...</p>
      </div>
    );
  }

  if (isProtected && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-warning mb-4" />
        <h2 className="text-lg font-bold text-text-primary mb-2">
          할당된 프로젝트가 없습니다
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          접근 가능한 프로젝트가 없습니다. 관리자에게 문의하세요.
        </p>
        <Button onClick={() => navigate('/')}>홈으로 이동</Button>
      </div>
    );
  }

  return <>{children}</>;
}

function InnerLayout() {
  const { t } = useTranslation();
  const { username } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/v1alpha1/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    }
    window.location.href = '/login';
  };

  return (
    <div className="flex flex-col min-h-svh">
      {/* GNB Header */}
      <header className="h-[var(--header-height)] border-b border-border flex items-center justify-between px-4 bg-header-bg shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <NavLink to="/" className="flex items-center gap-1.5">
            <svg className="h-7 w-7" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" fill="#2e7bff" />
              <path
                d="M16 6c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10S21.52 6 16 6zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L13 19v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H12v-2h2c.55 0 1-.45 1-1v-2h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                fill="white"
              />
            </svg>
            <span className="text-[17px] font-bold text-text-primary tracking-tight">AIPub</span>
          </NavLink>
        </div>
        <div className="flex items-center gap-0.5">
          <button className="p-2 rounded-md hover:bg-muted-bg text-text-secondary transition-colors">
            <Globe className="h-[18px] w-[18px]" />
          </button>
          <button className="p-2 rounded-md hover:bg-muted-bg text-text-secondary transition-colors relative">
            <Bell className="h-[18px] w-[18px]" />
          </button>
          <button className="p-2 rounded-md hover:bg-muted-bg text-text-secondary transition-colors">
            <BarChart3 className="h-[18px] w-[18px]" />
          </button>
          <div className="relative">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="p-2 rounded-md hover:bg-muted-bg text-text-secondary transition-colors"
            >
              <User className="h-[18px] w-[18px]" />
            </button>
            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-52 rounded-lg border border-border bg-white shadow-lg py-1">
                  {username && (
                    <div className="px-4 py-2.5 border-b border-border">
                      <p className="text-sm font-medium text-text-primary">{username}</p>
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-text-secondary hover:bg-muted-bg transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`${sidebarOpen ? 'w-[var(--sidebar-width)]' : 'w-0 overflow-hidden'} border-r border-sidebar-border bg-sidebar-bg shrink-0 flex flex-col pt-5 overflow-y-auto transition-all duration-200`}
        >
          <div className="px-4 mb-2">
            <span className="text-xs font-medium text-sidebar-section tracking-wider uppercase">
              Brewery
            </span>
          </div>
          <nav className="flex flex-col gap-0.5 px-2 mb-6">
            <SidebarLink to="/" icon={<Home className="h-4 w-4" />} end>
              홈
            </SidebarLink>
            <SidebarLink to="/dockerfiles" icon={<FileCode2 className="h-4 w-4" />}>
              {t('nav.dockerfiles')}
            </SidebarLink>
            <SidebarLink to="/builds" icon={<Hammer className="h-4 w-4" />}>
              {t('nav.builds')}
            </SidebarLink>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-page-bg">
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="p-1 rounded-md hover:bg-muted-bg text-text-secondary transition-colors"
              title="Toggle Sidebar"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </button>
            <div className="h-4 w-px bg-border mx-1" />
            <Breadcrumb />
          </div>

          <div className="flex-1 px-6 py-5 overflow-auto">
            <NoProjectGuard>
              <Outlet />
            </NoProjectGuard>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <InnerLayout />
    </AuthProvider>
  );
}

function SidebarLink({
  to,
  icon,
  children,
  end,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-all ${
          isActive
            ? 'bg-sidebar-active-bg/40 text-primary font-medium'
            : 'text-sidebar-text hover:bg-sidebar-hover'
        }`
      }
    >
      <span className="shrink-0">{icon}</span>
      {children}
    </NavLink>
  );
}
