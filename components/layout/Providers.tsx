'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Providers Wrapper
// QueryClientProvider + Auth Hydration
// ═══════════════════════════════════════════════════════════

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/auth/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,    // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

import { ModalToastProvider } from '@/components/context/ModalToastContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hasHydrated = useRef(false);

  useEffect(() => {
    if (!hasHydrated.current) {
      hydrate();
      hasHydrated.current = true;
    }
  }, [hydrate]);

  return (
    <QueryClientProvider client={queryClient}>
      <ModalToastProvider>
        {children}
      </ModalToastProvider>
    </QueryClientProvider>
  );
}
