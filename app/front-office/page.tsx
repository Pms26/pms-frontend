'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth/AuthContext';

export default function FrontOfficeRootPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isHydrating = useAuthStore((s) => s.isHydrating);

  useEffect(() => {
    if (isHydrating) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    router.replace(
      user.role === 'comptable' ? '/front-office/payments' : '/front-office/check-in'
    );
  }, [router, user, isHydrating]);

  return null;
}
