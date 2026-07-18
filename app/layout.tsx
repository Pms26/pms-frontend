import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/layout/Providers';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'OASIS PMS — Property Management System',
  description:
    'Système de gestion hôtelière ultra-moderne : planning, réservations, front office, housekeeping, tarifs et analytics.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
