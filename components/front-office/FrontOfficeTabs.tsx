'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function FrontOfficeTabs() {
  const pathname = usePathname();
  
  const isCheckIn = pathname.startsWith('/front-office/check-in');
  const isCheckOut = pathname.startsWith('/front-office/check-out');

  return (
    <ul className="fo-tabs mb-4">
      <li className={`fo-tab ${isCheckIn ? 'active' : ''}`}>
        <Link href="/front-office/check-in" className="d-flex align-items-center gap-2" style={{ color: 'inherit', textDecoration: 'none' }}>
          <i className="bi bi-box-arrow-in-right me-2" />
          Check-in
        </Link>
      </li>
      <li className={`fo-tab ${isCheckOut ? 'active' : ''}`}>
        <Link href="/front-office/check-out" className="d-flex align-items-center gap-2" style={{ color: 'inherit', textDecoration: 'none' }}>
          <i className="bi bi-box-arrow-right me-2" />
          Check-out
        </Link>
      </li>
    </ul>
  );
}
