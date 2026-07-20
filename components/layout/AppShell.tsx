'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — App Shell Layout (reproduction exacte du style)
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import GlobalModals from '@/components/layout/GlobalModals';

// Pages publiques qui n'ont pas besoin du shell (sidebar/header)
const NO_SHELL_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password'
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Pages publiques → no shell (pas de sidebar/header)
  if (NO_SHELL_PATHS.some((path) => pathname.startsWith(path))) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="app-wrapper">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        <div className="main-content">
          <Header collapsed={collapsed} onToggleSidebar={() => setCollapsed(!collapsed)} />
          <main className="pms-section active">{children}</main>
        </div>
      </div>

      {/* Global React modals & toast (components with local state) */}
      <GlobalModals />
    </>
  );
}