import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  FileCode2,
  Hammer,
  Home,
  Globe,
  User,
  PanelLeftClose,
  PanelLeft,
  AlertCircle,
  LogOut,
  Sun,
  Moon,
  Check,
} from 'lucide-react';
import { AuthProvider, useAuth } from '@/hooks/useAuthContext';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu';

function Logo() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 64 64" fill="none">
      <circle cx="20" cy="32" r="12" fill="#FF9500" />
      <path
        d="M28 20c6.627 0 12 5.373 12 12s-5.373 12-12 12"
        stroke="var(--primary)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="44" cy="32" r="8" fill="var(--primary)" />
    </svg>
  );
}

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
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <NavLink to="/" className="transition-colors hover:text-foreground">
        <Home className="h-4 w-4" />
      </NavLink>
      {segments.map((seg, i) => {
        const label = labels[seg] || seg;
        const isLast = i === segments.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            <span className="text-muted-foreground/60">/</span>
            {isLast ? (
              <span className="text-foreground">{label}</span>
            ) : (
              <NavLink
                to={'/' + segments.slice(0, i + 1).join('/')}
                className="transition-colors hover:text-foreground"
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
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  if (isProtected && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-warning" />
        <h2 className="mb-2 text-lg font-bold text-foreground">할당된 프로젝트가 없습니다</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          접근 가능한 프로젝트가 없습니다. 관리자에게 문의하세요.
        </p>
        <Button onClick={() => navigate('/')}>홈으로 이동</Button>
      </div>
    );
  }

  return <>{children}</>;
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="text-muted-foreground"
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </Button>
  );
}

function LanguageMenu() {
  const { i18n } = useTranslation();
  const langs: { code: string; label: string }[] = [
    { code: 'ko', label: '한국어' },
    { code: 'en', label: 'English' },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Globe className="h-[18px] w-[18px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {langs.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => i18n.changeLanguage(l.code)}>
            {l.label}
            {i18n.language.startsWith(l.code) && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProfileMenu() {
  const { username } = useAuth();
  const handleLogout = async () => {
    try {
      await fetch('/api/v1alpha1/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    }
    window.location.href = '/welcome';
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <User className="h-[18px] w-[18px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {username && <DropdownMenuLabel>{username}</DropdownMenuLabel>}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InnerLayout() {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-svh flex-col">
      {/* GNB Header */}
      <header className="flex h-[var(--header-height)] shrink-0 items-center justify-between border-b bg-sidebar-background px-4 z-10">
        <NavLink to="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-[17px] font-bold tracking-tight text-foreground">Dockerizer</span>
        </NavLink>
        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <LanguageMenu />
          <ProfileMenu />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-[var(--sidebar-width)]' : 'w-0 overflow-hidden'
          } flex shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar-background pt-5 transition-all duration-200`}
        >
          <div className="mb-2 px-4">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Dockerizer
            </span>
          </div>
          <nav className="mb-6 flex flex-col gap-0.5 px-2">
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
        <main className="flex min-w-0 flex-1 flex-col bg-background">
          <div className="flex items-center gap-2 border-b px-4 py-2.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSidebarOpen((v) => !v)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
                >
                  {sidebarOpen ? (
                    <PanelLeftClose className="h-4 w-4" />
                  ) : (
                    <PanelLeft className="h-4 w-4" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>사이드바 토글</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <Breadcrumb />
          </div>

          <div className="flex-1 overflow-auto px-6 py-5">
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
        `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-all ${
          isActive
            ? 'bg-sidebar-active-background/40 font-medium text-primary'
            : 'text-sidebar-foreground hover:bg-accent'
        }`
      }
    >
      <span className="shrink-0">{icon}</span>
      {children}
    </NavLink>
  );
}
