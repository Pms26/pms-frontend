// ═══════════════════════════════════════════════════════════
// OASIS PMS — Front Office API
// Backend: front-office (port 4005) via gateway
// Routes: /api/rooms, /api/checkin, /api/checkout, /api/folios,
//         /api/payments, /api/invoices
// Pattern: Analytics (aucun fallback mock) — les erreurs backend
// sont normalisées ici : 502 → « Service temporairement
// indisponible », sinon message exact du body { error }.
// ═══════════════════════════════════════════════════════════

import axios from 'axios';
import apiClient from './client';
import type {
  Room,
  HousekeepingStatus,
  Booking,
  Proforma,
  FolioDetail,
  Statement,
  PaymentsResponse,
  InvoicesResponse,
  CheckInResult,
  CheckOutPayment,
  CheckOutResult,
} from '@/types';

function toApiError(err: unknown): Error {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 502) return new Error('Service temporairement indisponible');
    const body = err.response?.data as { error?: string } | undefined;
    if (body?.error) return new Error(body.error);
  }
  return new Error('Service temporairement indisponible');
}

// ─── Chambres ─────────────────────────────────────────────

export async function getRooms(): Promise<Room[]> {
  try {
    const res = await apiClient.get('/api/front-office/rooms');
    return res.data.rooms || [];
  } catch (err) {
    throw toApiError(err);
  }
}

export async function getRoomsByStatus(status: HousekeepingStatus): Promise<Room[]> {
  try {
    const res = await apiClient.get(`/api/front-office/rooms/status/${status}`);
    return res.data.rooms || [];
  } catch (err) {
    throw toApiError(err);
  }
}

export async function getRoom(roomId: string): Promise<Room> {
  try {
    const res = await apiClient.get(`/api/front-office/rooms/${roomId}`);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updateRoomStatus(
  roomId: string,
  housekeepingStatus: HousekeepingStatus,
  blockReason?: string,
): Promise<Room> {
  try {
    const res = await apiClient.patch(`/api/front-office/rooms/${roomId}/status`, {
      housekeepingStatus,
      blockReason: housekeepingStatus === 'bloquee' ? blockReason : undefined,
    });
    return res.data.room;
  } catch (err) {
    throw toApiError(err);
  }
}

// ─── Check-in ─────────────────────────────────────────────

export async function getBooking(bookingId: string): Promise<Booking> {
  try {
    const res = await apiClient.get(`/api/front-office/checkin/${bookingId}`);
    return res.data.booking;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function getProforma(bookingId: string): Promise<Proforma> {
  try {
    const res = await apiClient.get(`/api/front-office/checkin/${bookingId}/proforma`);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function performCheckIn(bookingId: string): Promise<CheckInResult> {
  try {
    const res = await apiClient.post(`/api/front-office/checkin/${bookingId}`);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function cancelCheckIn(
  bookingId: string,
): Promise<{ message: string; booking: { id: string; status: string } }> {
  try {
    const res = await apiClient.delete(`/api/front-office/checkin/${bookingId}`);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

// ─── Check-out ────────────────────────────────────────────

export async function getStatement(bookingId: string): Promise<Statement> {
  try {
    const res = await apiClient.get(`/api/front-office/checkout/${bookingId}/statement`);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function performCheckOut(
  bookingId: string,
  payments: CheckOutPayment[],
): Promise<CheckOutResult> {
  try {
    const res = await apiClient.post(`/api/front-office/checkout/${bookingId}`, { payments });
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

// ─── Folios ───────────────────────────────────────────────

export async function getFolio(folioId: string): Promise<FolioDetail> {
  try {
    const res = await apiClient.get(`/api/front-office/folios/${folioId}`);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function addFolioItem(
  folioId: string,
  item: { description: string; category: string; quantity: number; unitPrice: number; taxRate?: number },
): Promise<{ message: string; item: unknown; folioTotal: number }> {
  try {
    const res = await apiClient.post(`/api/front-office/folios/${folioId}/items`, item);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function setItemVisibility(
  itemId: string,
  isVisible: boolean,
): Promise<{ message: string; item: { id: string; description: string; isVisibleOnPrint: boolean } }> {
  try {
    const res = await apiClient.patch(`/api/front-office/folios/items/${itemId}/visibility`, { isVisible });
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function setItemsVisibility(
  folioId: string,
  itemIds: string[],
  isVisible: boolean,
): Promise<{ message: string }> {
  try {
    const res = await apiClient.patch(`/api/front-office/folios/${folioId}/items/visibility`, {
      itemIds,
      isVisible,
    });
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function deleteFolioItem(itemId: string): Promise<{ message: string; folioTotal: number }> {
  try {
    const res = await apiClient.delete(`/api/front-office/folios/items/${itemId}`);
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

// ─── Paiements & factures du jour ─────────────────────────

export async function getPayments(date: string): Promise<PaymentsResponse> {
  try {
    const res = await apiClient.get('/api/front-office/payments', { params: { date } });
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function getInvoices(date: string): Promise<InvoicesResponse> {
  try {
    const res = await apiClient.get('/api/front-office/invoices', { params: { date } });
    return res.data;
  } catch (err) {
    throw toApiError(err);
  }
}
