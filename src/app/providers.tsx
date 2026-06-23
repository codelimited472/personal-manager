'use client';

import { AuthProvider, useAuth } from '@/features/auth/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';
import { SyncProvider } from '@/hooks/useSync';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmModalProvider } from '@/components/ui/ConfirmModal';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import QuickAdd from '@/components/layout/QuickAdd';
import { usePathname } from 'next/navigation';

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (loading) {
    return (
      <div className="app-layout">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100dvh',
        }}>
          <div className="animate-spin" style={{
            width: 32,
            height: 32,
            border: '3px solid var(--border-primary)',
            borderTopColor: 'var(--accent-primary)',
            borderRadius: '50%',
          }} />
        </div>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <SyncProvider userId={user?.id ?? null}>
      <div className="app-layout">
        <Header />
        <main className="app-content">
          {children}
        </main>
        <QuickAdd />
        <BottomNav />
      </div>
    </SyncProvider>
  );
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <ConfirmModalProvider />
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
