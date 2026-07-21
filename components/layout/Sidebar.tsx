'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Sidebar Navigation (Reproduction Exacte du Style)
// ═══════════════════════════════════════════════════════════

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/AuthContext';
import { Suspense } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  exact?: boolean;
  match?: (pathname: string, searchParams: URLSearchParams) => boolean;
}

const EXPLOITATION_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', href: '/dashboard', icon: 'bi-speedometer2', exact: true },
  { label: 'Planning', href: '/reservations', icon: 'bi-calendar3', match: (pathname, searchParams) => pathname === '/reservations' && searchParams.get('view') !== 'list' },
  { label: 'Réservations', href: '/reservations?view=list', icon: 'bi-journal-bookmark', match: (pathname, searchParams) => pathname === '/reservations' && searchParams.get('view') === 'list' },
  { label: 'Front Office', href: '/front-office/check-in', icon: 'bi-door-open', match: (pathname) => pathname.startsWith('/front-office') },
  { label: 'Housekeeping', href: '/housekeeping', icon: 'bi-stars' },
];

const GESTION_ITEMS: NavItem[] = [
  { label: 'Tarifs & Extras', href: '/tarification', icon: 'bi-tags' },
  { label: 'Night Audit', href: '/night-audit', icon: 'bi-moon-stars' },
  { label: 'Analytics', href: '/analytics', icon: 'bi-bar-chart-line' },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: 'Utilisateurs', href: '/users', icon: 'bi-people' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const ROLE_LABELS = {
  admin: 'Administrateur',
  manager: 'Manager',
  receptionist: 'Réceptionniste',
  housekeeping_supervisor: 'Gouvernante'
};

function SidebarNavContent({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    await logout();
  };

  const isActive = (item: NavItem) => {
    if (item.match) {
      return item.match(pathname, searchParams);
    }
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const gestionItems =
    user?.role === 'admin' ? [...GESTION_ITEMS, ...ADMIN_ITEMS] : GESTION_ITEMS;

  return (
    <>
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <i className="bi bi-building text-white" />
        </div>
        <span className="sidebar-name">OASIS PMS</span>
      </div>

      <ul className="sidebar-nav">
        <li className="nav-section-title">EXPLOITATION</li>
        {EXPLOITATION_ITEMS.map((item, idx) => (
          <li key={idx}>
            <Link
              href={item.href}
              className={`sidebar-link ${isActive(item) ? 'active' : ''}`}
            >
              <i className={`bi ${item.icon}`} />
              <span>{item.label}</span>
            </Link>
          </li>
        ))}

        <li className="nav-section-title mt-2">GESTION</li>
        {gestionItems.map((item, idx) => (
          <li key={idx}>
            <Link
              href={item.href}
              className={`sidebar-link ${isActive(item) ? 'active' : ''}`}
            >
              <i className={`bi ${item.icon}`} />
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-avatar">{initials}</div>

          <div className="user-info">
            <div className="user-name">{user?.name || 'Utilisateur'}</div>
            <div className="user-role">
              {user ? ROLE_LABELS[user.role] : 'Session non chargée'}
            </div>
          </div>

          <button
            type="button"
            className="btn-logout"
            onClick={handleLogout}
            title="Déconnexion"
          >
            <i className="bi bi-box-arrow-right" />
          </button>
        </div>
      </div>
    </>
  );
}

export default function Sidebar({ collapsed }: SidebarProps) {
  return (
    <nav className={`sidebar ${collapsed ? 'collapsed' : ''}`} id="sidebar">
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <i className="bi bi-arrow-repeat animate-spin text-xl" />
        </div>
      }>
        <SidebarNavContent collapsed={collapsed} />
      </Suspense>
    </nav>
  );
}