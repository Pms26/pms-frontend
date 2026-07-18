import React, { Suspense } from 'react';
import ReservationsClient from '@/components/reservations/ReservationsClient';

export default function ReservationsPage() {
  return (
    <Suspense fallback={<div className="p-4">Chargement…</div>}>
      <ReservationsClient />
    </Suspense>
  );
}
