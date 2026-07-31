'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/AuthContext';

const FO_TABS = [
  { label: 'Check-in', href: '/front-office/check-in', icon: 'bi-box-arrow-in-right' },
  { label: 'Check-out', href: '/front-office/check-out', icon: 'bi-box-arrow-right' },
  { label: 'Paiements', href: '/front-office/payments', icon: 'bi-cash-stack' },
];

export default function FrontOfficeTabs() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  const visibleTabs = FO_TABS.filter((tab) => {
    if (role === 'comptable') return tab.href === '/front-office/payments';
    if (role === 'housekeeping_supervisor') return tab.href !== '/front-office/check-out';
    return true;
  });

  return (
    <ul className="fo-tabs mb-4">
      {visibleTabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <li key={tab.href} className={`fo-tab ${isActive ? 'active' : ''}`}>
            <Link href={tab.href} className="d-flex align-items-center gap-2" style={{ color: 'inherit', textDecoration: 'none' }}>
              <i className={`bi ${tab.icon} me-2`} />
              {tab.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
