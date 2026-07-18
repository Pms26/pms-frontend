// ═══════════════════════════════════════════════════════════
// OASIS PMS — Front Office API
// Endpoints: /api/front-office/check-ins, /check-outs, /check-in, /check-out
// ═══════════════════════════════════════════════════════════

import apiClient, { USE_MOCKS, mockDelay } from './client';
import { updateReservation } from './reservations';
import type { Reservation, FolioEntry, CheckOutSummary, PaymentMode } from '@/types';

// ─── Mock Data ───────────────────────────────────────────

const MOCK_CHECKINS: Reservation[] = [
  { id: 'R-2026-003', client: 'Cherkaoui Yassine', room: '102', arrival: '2026-07-09', departure: '2026-07-14', regime: 'DP', segment: 'b2b', status: 'confirmed', total: '8 400 DH', pax: 2 },
  { id: 'R-2026-004', client: 'Idrissi Nadia', room: '301', arrival: '2026-07-09', departure: '2026-07-11', regime: 'BB', segment: 'direct', status: 'confirmed', total: '4 200 DH', pax: 1 },
  { id: 'R-2026-005', client: 'Martin Julie', room: '310', arrival: '2026-07-10', departure: '2026-07-15', regime: 'BB', segment: 'ota', status: 'option', total: '9 500 DH', pax: 2 },
];

const MOCK_CHECKOUTS: Reservation[] = [
  { id: 'R-2026-006', client: 'Hassan Ahmed', room: '402', arrival: '2026-07-08', departure: '2026-07-09', regime: 'BB', segment: 'b2b', status: 'checkout', total: '2 100 DH', pax: 1 },
  { id: 'R-2026-002', client: 'Benali Sophia', room: '205', arrival: '2026-07-08', departure: '2026-07-10', regime: 'PC', segment: 'ota', status: 'inhouse', total: '5 200 DH', pax: 2 },
];

const MOCK_FOLIO_A: FolioEntry[] = [
  { prestation: 'Hébergement Suite — 2 nuits', date: '2026-07-08', qty: 2, amount: '3 600 DH' },
  { prestation: 'Petit-déjeuner (BB)', date: '2026-07-08', qty: 2, amount: '0 DH' },
  { prestation: 'Petit-déjeuner (BB)', date: '2026-07-09', qty: 2, amount: '0 DH' },
  { prestation: 'Room Service — Dîner', date: '2026-07-08', qty: 1, amount: '450 DH' },
  { prestation: 'Minibar', date: '2026-07-09', qty: 1, amount: '120 DH' },
  { prestation: 'Taxe de séjour', date: '2026-07-08', qty: 2, amount: '60 DH' },
];

const MOCK_FOLIO_B: FolioEntry[] = [
  { prestation: 'Transfert aéroport (aller)', date: '2026-07-08', qty: 1, amount: '250 DH' },
  { prestation: 'SPA — Massage 60mn', date: '2026-07-09', qty: 1, amount: '350 DH' },
];

// ─── API Functions ───────────────────────────────────────

export async function getPendingCheckIns(): Promise<Reservation[]> {
  if (USE_MOCKS) {
    await mockDelay();
    return [...MOCK_CHECKINS];
  }

  const res = await apiClient.get<Reservation[]>('/api/front-office/check-ins');
  return res.data;
}

export async function getPendingCheckOuts(): Promise<Reservation[]> {
  if (USE_MOCKS) {
    await mockDelay();
    return [...MOCK_CHECKOUTS];
  }

  const res = await apiClient.get<Reservation[]>('/api/front-office/check-outs');
  return res.data;
}

export async function getFolioA(reservationId: string): Promise<{ entries: FolioEntry[]; total: string }> {
  if (USE_MOCKS) {
    await mockDelay(300);
    return { entries: MOCK_FOLIO_A, total: '4 230 DH' };
  }

  const res = await apiClient.get(`/api/front-office/folio/${reservationId}/A`);
  return res.data;
}

export async function getFolioB(reservationId: string): Promise<{ entries: FolioEntry[]; total: string }> {
  if (USE_MOCKS) {
    await mockDelay(300);
    return { entries: MOCK_FOLIO_B, total: '600 DH' };
  }

  const res = await apiClient.get(`/api/front-office/folio/${reservationId}/B`);
  return res.data;
}

export async function performCheckIn(reservationId: string): Promise<{ success: boolean; message: string }> {
  if (USE_MOCKS) {
    await mockDelay(600);
    const index = MOCK_CHECKINS.findIndex((reservation) => reservation.id === reservationId);
    if (index !== -1) {
      const reservation = MOCK_CHECKINS.splice(index, 1)[0];
      await updateReservation(reservationId, { status: 'inhouse' });
      return { success: true, message: `Check-in effectué pour ${reservationId}` };
    }

    return { success: false, message: `Réservation ${reservationId} introuvable` };
  }

  const res = await apiClient.post('/api/front-office/check-in', { reservation_id: reservationId });
  return res.data;
}

export async function performCheckOut(
  reservationId: string,
  paymentModes: PaymentMode[],
): Promise<{ success: boolean; message: string }> {
  if (USE_MOCKS) {
    await mockDelay(800);
    const index = MOCK_CHECKOUTS.findIndex((reservation) => reservation.id === reservationId);
    if (index !== -1) {
      const reservation = MOCK_CHECKOUTS.splice(index, 1)[0];
      if (reservation.status !== 'checkout') {
        await updateReservation(reservationId, { status: 'checkout' });
      }
      return { success: true, message: `Check-out validé pour ${reservationId}` };
    }

    return { success: false, message: `Réservation ${reservationId} introuvable` };
  }

  const res = await apiClient.post('/api/front-office/check-out', {
    reservation_id: reservationId,
    payment_modes: paymentModes,
  });
  return res.data;
}

export async function getCheckOutSummary(reservationId: string): Promise<CheckOutSummary> {
  if (USE_MOCKS) {
    await mockDelay(300);
    return {
      hebergement: '3 000 DH',
      extras: '450 DH',
      taxeSejour: '90 DH',
      total: '3 540 DH',
    };
  }

  const res = await apiClient.get<CheckOutSummary>(`/api/front-office/check-out-summary/${reservationId}`);
  return res.data;
}
