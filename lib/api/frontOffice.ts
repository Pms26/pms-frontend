// ═══════════════════════════════════════════════════════════
// OASIS PMS — Front Office API
// Backend: front-office (port 4005) via gateway
// Routes: /api/rooms, /api/checkin, /api/checkout, /api/folios
// ═══════════════════════════════════════════════════════════

import apiClient, { USE_MOCKS, mockDelay } from './client';
import { updateReservation } from './reservations';
import type { Reservation, FolioEntry, CheckOutSummary, PaymentMode } from '@/types';

const MOCK_CHECKINS: Reservation[] = [
  { id: 'R-2026-003', client: 'Cherkaoui Yassine', room: '102', arrival: '2026-07-09', departure: '2026-07-14', regime: 'DP', segment: 'b2b', status: 'confirmed', total: '8 400 DH', pax: 2 },
  { id: 'R-2026-004', client: 'Idrissi Nadia', room: '301', arrival: '2026-07-09', departure: '2026-07-11', regime: 'BB', segment: 'direct', status: 'confirmed', total: '4 200 DH', pax: 1 },
];

const MOCK_CHECKOUTS: Reservation[] = [
  { id: 'R-2026-006', client: 'Hassan Ahmed', room: '402', arrival: '2026-07-08', departure: '2026-07-09', regime: 'BB', segment: 'b2b', status: 'checkout', total: '2 100 DH', pax: 1 },
];

const MOCK_FOLIO_A: FolioEntry[] = [
  { prestation: 'Hébergement — 2 nuits', date: '2026-07-08', qty: 2, amount: '3 600 DH' },
  { prestation: 'Room Service — Dîner', date: '2026-07-08', qty: 1, amount: '450 DH' },
  { prestation: 'Minibar', date: '2026-07-09', qty: 1, amount: '120 DH' },
];

const MOCK_FOLIO_B: FolioEntry[] = [
  { prestation: 'Transfert aéroport', date: '2026-07-08', qty: 1, amount: '250 DH' },
  { prestation: 'SPA — Massage 60mn', date: '2026-07-09', qty: 1, amount: '350 DH' },
];

function mapRoomToFrontend(r: any): Reservation {
  return {
    id: r.bookingId || r.bookingRef || r.id || r.roomNumber,
    client: r.guestName || r.customerName || 'Client',
    room: r.roomNumber || r.numero || r.id,
    arrival: r.checkInDate ? r.checkInDate.slice(0, 10) : '',
    departure: r.checkOutDate ? r.checkOutDate.slice(0, 10) : '',
    regime: r.boardType || 'BB',
    segment: r.segment || 'direct',
    status: r.status === 'status_confirmed' ? 'confirmed' : r.status === 'status_checked_in' ? 'inhouse' : r.status || 'confirmed',
    total: r.totalAmount ? `${Number(r.totalAmount).toLocaleString('fr-FR')} DH` : '0 DH',
    pax: r.adults || 2,
  };
}

export async function getPendingCheckIns(): Promise<Reservation[]> {
  if (USE_MOCKS) {
    await mockDelay();
    return [...MOCK_CHECKINS];
  }

  try {
    const res = await apiClient.get('/api/front-office/rooms');
    const data = res.data;
    const rooms = data.rooms || data || [];
    return rooms.map((r: any) => ({
      id: r.bookingId || r.bookingRef || r.id || r.roomNumber,
      client: r.guestName || r.customerName || r.roomNumber,
      room: r.roomNumber || r.numero || '',
      arrival: r.checkInDate ? r.checkInDate.slice(0, 10) : '',
      departure: r.checkOutDate ? r.checkOutDate.slice(0, 10) : '',
      regime: r.boardType || 'BB',
      segment: r.segment || 'direct',
      status: 'confirmed' as const,
      total: r.totalAmount ? `${Number(r.totalAmount).toLocaleString('fr-FR')} DH` : '0 DH',
      pax: r.adults || 2,
    }));
  } catch {
    return [];
  }
}

export async function getPendingCheckOuts(): Promise<Reservation[]> {
  if (USE_MOCKS) {
    await mockDelay();
    return [...MOCK_CHECKOUTS];
  }

  try {
    const res = await apiClient.get('/api/front-office/rooms/status/sale');
    const data = res.data;
    const rooms = data.rooms || data || [];
    return rooms.map((r: any) => ({
      id: r.bookingId || r.bookingRef || r.id || r.roomNumber,
      client: r.guestName || r.customerName || r.roomNumber,
      room: r.roomNumber || r.numero || '',
      arrival: r.checkInDate ? r.checkInDate.slice(0, 10) : '',
      departure: r.checkOutDate ? r.checkOutDate.slice(0, 10) : '',
      regime: r.boardType || 'BB',
      segment: r.segment || 'direct',
      status: 'inhouse' as const,
      total: r.totalAmount ? `${Number(r.totalAmount).toLocaleString('fr-FR')} DH` : '0 DH',
      pax: r.adults || 2,
    }));
  } catch {
    return [];
  }
}

export async function getFolioA(reservationId: string): Promise<{ entries: FolioEntry[]; total: string }> {
  if (USE_MOCKS) {
    await mockDelay(300);
    return { entries: MOCK_FOLIO_A, total: '4 230 DH' };
  }

  try {
    const res = await apiClient.get(`/api/front-office/folios/${reservationId}`);
    const data = res.data;
    const items = data.allItems || data.printableItems || data.entries || [];
    const entries: FolioEntry[] = items.map((item: any) => ({
      prestation: item.description || item.prestation || item.label || '',
      date: item.date ? item.date.slice(0, 10) : '',
      qty: item.quantity || item.qty || 1,
      amount: item.amount != null ? `${Number(item.amount).toLocaleString('fr-FR')} DH` : '0 DH',
    }));
    const total = data.printableTotal || data.totalAmount
      ? `${Number(data.printableTotal || data.totalAmount).toLocaleString('fr-FR')} DH`
      : '0 DH';
    return { entries, total };
  } catch {
    return { entries: [], total: '0 DH' };
  }
}

export async function getFolioB(reservationId: string): Promise<{ entries: FolioEntry[]; total: string }> {
  if (USE_MOCKS) {
    await mockDelay(300);
    return { entries: MOCK_FOLIO_B, total: '600 DH' };
  }

  try {
    const res = await apiClient.get(`/api/front-office/folios/${reservationId}`);
    const data = res.data;
    const items = data.allItems || data.printableItems || data.entries || [];
    const entries: FolioEntry[] = items.map((item: any) => ({
      prestation: item.description || item.prestation || item.label || '',
      date: item.date ? item.date.slice(0, 10) : '',
      qty: item.quantity || item.qty || 1,
      amount: item.amount != null ? `${Number(item.amount).toLocaleString('fr-FR')} DH` : '0 DH',
    }));
    const total = data.printableTotal || data.totalAmount
      ? `${Number(data.printableTotal || data.totalAmount).toLocaleString('fr-FR')} DH`
      : '0 DH';
    return { entries, total };
  } catch {
    return { entries: [], total: '0 DH' };
  }
}

export async function performCheckIn(reservationId: string): Promise<{ success: boolean; message: string }> {
  if (USE_MOCKS) {
    await mockDelay(600);
    return { success: true, message: `Check-in effectué pour ${reservationId}` };
  }

  try {
    const res = await apiClient.post(`/api/front-office/checkin/${reservationId}`);
    const data = res.data;
    return { success: true, message: data.message || `Check-in effectué pour ${reservationId}` };
  } catch (err: any) {
    return { success: false, message: err?.response?.data?.error || err?.response?.data?.message || 'Erreur check-in' };
  }
}

export async function performCheckOut(
  reservationId: string,
  paymentModes: PaymentMode[],
): Promise<{ success: boolean; message: string }> {
  if (USE_MOCKS) {
    await mockDelay(800);
    return { success: true, message: `Check-out validé pour ${reservationId}` };
  }

  try {
    const res = await apiClient.post(`/api/front-office/checkout/${reservationId}`, {
      payments: paymentModes.map((pm) => ({
        paymentMethod: pm,
        folioType: 'A',
      })),
    });
    const data = res.data;
    return { success: true, message: data.message || `Check-out validé pour ${reservationId}` };
  } catch (err: any) {
    return { success: false, message: err?.response?.data?.error || err?.response?.data?.message || 'Erreur check-out' };
  }
}

export async function getCheckOutSummary(reservationId: string): Promise<CheckOutSummary> {
  if (USE_MOCKS) {
    await mockDelay(300);
    return { hebergement: '3 000 DH', extras: '450 DH', taxeSejour: '90 DH', total: '3 540 DH' };
  }

  try {
    const res = await apiClient.get(`/api/front-office/checkout/${reservationId}/statement`);
    const data = res.data;
    return {
      hebergement: `${(data.totalCharges || 0).toLocaleString('fr-FR')} DH`,
      extras: '0 DH',
      taxeSejour: '0 DH',
      total: `${(data.totalCharges || 0).toLocaleString('fr-FR')} DH`,
    };
  } catch {
    return { hebergement: '0 DH', extras: '0 DH', taxeSejour: '0 DH', total: '0 DH' };
  }
}
