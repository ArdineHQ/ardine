'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useCanManageTeam } from '@/lib/auth-context';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useEffect, useMemo } from 'react';
import { ChevronDown, Check, Settings } from 'lucide-react';

const allNavigationItems = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Clients', href: '/clients' },
  { name: 'Projects', href: '/projects' },
  { name: 'Time', href: '/time' },
  { name: 'Invoices', href: '/invoices', requiresRoles: ['OWNER', 'ADMIN', 'BILLING'] },
];

export function Navigation() {
  const pathname = usePathname();
  const { currentTeam } = useAuth();

  // Filter navigation items based on user's team role
  const navigationItems = useMemo(() => {
    return allNavigationItems.filter((item) => {
      // If no role requirement, show to everyone
      if (!item.requiresRoles) return true;

      // If requires specific roles, check if user has one of them
      if (!currentTeam?.role) return false;
      return item.requiresRoles.includes(currentTeam.role);
    });
  }, [currentTeam?.role]);

  return (
    <div className="flex gap-4">
      {navigationItems.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`text-sm hover:text-primary ${
              isActive ? 'text-primary font-medium' : ''
            }`}
          >
            {item.name}
          </Link>
        );
      })}
    </div>
  );
}

export function UserMenu() {
  const { user, logout, instanceRole, teams, currentTeam, switchTeam } = useAuth();
  const canManageTeam = useCanManageTeam();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/register">Sign up</Link>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          {user.name}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[500px] p-0">
        <div className="flex">
          {/* Left Column - Team Switcher */}
          {currentTeam && teams.length > 0 && (
            <div className="flex-1 border-r dark:border-border p-4 min-h-[200px]">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Current Team</p>
                <div className="flex items-center space-x-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white text-xs font-semibold">
                    {currentTeam.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{currentTeam.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{currentTeam.role.toLowerCase()}</p>
                  </div>
                  {canManageTeam && (
                    <Link href="/team/settings" className="flex-shrink-0">
                      <button className="p-1.5 rounded-md hover:bg-accent transition-colors" title="Team Settings">
                        <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    </Link>
                  )}
                </div>
              </div>

              {teams.length > 1 && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Switch Team</p>
                  <div className="space-y-1">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => switchTeam(team.id)}
                        className="w-full flex items-center space-x-2 p-2 rounded-md hover:bg-accent transition-colors"
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-white text-xs font-semibold">
                          {team.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium truncate">{team.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{team.role.toLowerCase()}</p>
                        </div>
                        {team.id === currentTeam.id && (
                          <Check className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Right Column - User Actions */}
          <div className="flex-1 p-4 flex flex-col min-h-[200px]">
            <div className="mb-4">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>

            <div className="space-y-1 flex-1">
              <Link
                href="/settings"
                className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
              >
                Settings
              </Link>
              {instanceRole === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="block w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                >
                  Admin Dashboard
                </Link>
              )}
            </div>

            <div className="border-t dark:border-border pt-2 mt-2">
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PageLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-xl font-bold">
                Ardine
              </Link>
              {user && <Navigation />}
            </div>
            <UserMenu />
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
