// ═══════════════════════════════════════════════════════════
// OASIS PMS — Reservations API
// Backend: service-reservations (port 4003) via gateway
// Routes: GET/POST /api/bookings, GET /api/customers/search
// ═══════════════════════════════════════════════════════════

import apiClient, { USE_MOCKS, mockDelay } from './client';
import type { Reservation, ReservationStatus, MarketSegment, MealPlan, Client } from '@/types';

const MOCK_RESERVATIONS: Reservation[] = [
  { id: 'R-2026-001', client: 'Alami Karim', room: '201', arrival: '2026-07-08', departure: '2026-07-12', regime: 'BB', segment: 'direct', status: 'inhouse', total: '6 800 DH', pax: 2 },
  { id: 'R-2026-002', client: 'Benali Sophia', room: '205', arrival: '2026-07-08', departure: '2026-07-10', regime: 'PC', segment: 'ota', status: 'inhouse', total: '5 200 DH', pax: 2 },
  { id: 'R-2026-003', client: 'Cherkaoui Y.', room: '102', arrival: '2026-07-09', departure: '2026-07-14', regime: 'DP', segment: 'b2b', status: 'confirmed', total: '8 400 DH', pax: 2 },
  { id: 'R-2026-004', client: 'Idrissi Nadia', room: '301', arrival: '2026-07-09', departure: '2026-07-11', regime: 'BB', segment: 'direct', status: 'confirmed', total: '4 200 DH', pax: 1 },
  { id: 'R-2026-005', client: 'Martin Julie', room: '310', arrival: '2026-07-10', departure: '2026-07-15', regime: 'BB', segment: 'ota', status: 'option', total: '9 500 DH', pax: 2 },
  { id: 'R-2026-006', client: 'Hassan Ahmed', room: '402', arrival: '2026-07-08', departure: '2026-07-09', regime: 'BB', segment: 'b2b', status: 'checkout', total: '2 100 DH', pax: 1 },
  { id: 'R-2026-007', client: 'Fassi Omar', room: '103', arrival: '2026-07-07', departure: '2026-07-08', regime: 'BB', segment: 'direct', status: 'noshow', total: '1 400 DH', pax: 1 },
  { id: 'R-2026-008', client: 'Dupont Pierre', room: '202', arrival: '2026-07-11', departure: '2026-07-14', regime: 'DP', segment: 'ota', status: 'confirmed', total: '5 600 DH', pax: 2 },
  { id: 'R-2026-009', client: 'García Maria', room: '303', arrival: '2026-07-08', departure: '2026-07-13', regime: 'PC', segment: 'direct', status: 'inhouse', total: '9 800 DH', pax: 2 },
  { id: 'R-2026-010', client: 'El Mansouri R.', room: '401', arrival: '2026-07-12', departure: '2026-07-16', regime: 'BB', segment: 'b2b', status: 'voucher', total: '7 200 DH', pax: 3 },
];

const MOCK_CLIENTS: Client[] = [
  { id: 1, nom: 'Alami', prenom: 'Karim', email: 'k.alami@email.ma', tel: '+212 661 000 001', notes: 'Client VIP' },
  { id: 2, nom: 'Benali', prenom: 'Sophia', email: 's.benali@email.ma', tel: '+212 661 000 002' },
  { id: 3, nom: 'Cherkaoui', prenom: 'Yassine', email: 'y.cherkaoui@email.ma', tel: '+212 661 000 003' },
];

const STATUS_BE_TO_FE: Record<string, ReservationStatus> = {
  status_option: 'option',
  status_confirmed: 'confirmed',
  status_voucher: 'voucher',
  status_checked_in: 'inhouse',
  status_checked_out: 'checkout',
  status_no_show: 'noshow',
  status_cancelled: 'cancelled',
};

const STATUS_FE_TO_BE: Record<string, string> = {
  option: 'status_option',
  confirmed: 'status_confirmed',
  voucher: 'status_voucher',
  inhouse: 'status_checked_in',
  checkout: 'status_checked_out',
  noshow: 'status_no_show',
  cancelled: 'status_cancelled',
};

const SEGMENT_BE_TO_FE: Record<string, MarketSegment> = {
  direct: 'direct',
  walk_in: 'direct',
  ota: 'ota',
  b2b: 'b2b',
  corporate: 'b2b',
  agency: 'b2b',
};

const REGIME_BE_TO_FE: Record<string, MealPlan> = {
  BB: 'BB', DP: 'DP', PC: 'PC',
};

function mapBookingToFrontend(b: any): Reservation {
  const customerName = b.customer
    ? `${b.customer.lastName || ''} ${b.customer.firstName || ''}`.trim()
    : b.guest?.lastName
    ? `${b.guest.lastName} ${b.guest.firstName || ''}`.trim()
    : 'Client inconnu';

  const roomNumber = b.room?.number || b.room?.roomNumber || b.room || '';
  const segmentCode = b.marketSegment?.code || b.marketSegment || 'direct';
  const rawStatus = b.status || 'status_option';

  return {
    id: b._id || b.reference || b.id,
    client: customerName,
    room: String(roomNumber),
    arrival: b.checkInDate ? b.checkInDate.slice(0, 10) : '',
    departure: b.checkOutDate ? b.checkOutDate.slice(0, 10) : '',
    regime: REGIME_BE_TO_FE[b.boardType] || 'BB',
    segment: SEGMENT_BE_TO_FE[segmentCode] || 'direct',
    status: STATUS_BE_TO_FE[rawStatus] || 'option',
    total: b.totalAmount != null ? `${Number(b.totalAmount).toLocaleString('fr-FR')} DH` : '0 DH',
    pax: b.adults ? b.adults + (b.children || 0) : undefined,
    notes: b.notes || undefined,
  };
}

interface ReservationFilters {
  search?: string;
  status?: ReservationStatus;
  segment?: MarketSegment;
}

export async function getReservations(filters?: ReservationFilters): Promise<Reservation[]> {
  if (USE_MOCKS) {
    await mockDelay();
    let result = [...MOCK_RESERVATIONS];
    if (filters?.status) result = result.filter((r) => r.status === filters.status);
    if (filters?.segment) result = result.filter((r) => r.segment === filters.segment);
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(
        (r) => r.client.toLowerCase().includes(s) || r.room.includes(s) || r.id.toLowerCase().includes(s),
      );
    }
    return result;
  }

  const params: Record<string, string> = {};
  if (filters?.status) params.status = STATUS_FE_TO_BE[filters.status] || filters.status;
  if (filters?.segment) params.segment = filters.segment;

  const res = await apiClient.get('/api/reservations/bookings', { params });
  let bookings = Array.isArray(res.data) ? res.data : res.data.bookings || [];

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    bookings = bookings.map(mapBookingToFrontend).filter(
      (r: Reservation) => r.client.toLowerCase().includes(s) || r.room.includes(s) || r.id.toLowerCase().includes(s),
    );
    return bookings;
  }

  return bookings.map(mapBookingToFrontend);
}

export async function getReservation(id: string): Promise<Reservation> {
  if (USE_MOCKS) {
    await mockDelay(200);
    const resa = MOCK_RESERVATIONS.find((r) => r.id === id);
    if (!resa) throw new Error(`Réservation ${id} introuvable`);
    return resa;
  }

  const res = await apiClient.get(`/api/reservations/bookings/${id}`);
  return mapBookingToFrontend(res.data);
}

export async function createReservation(data: Partial<Reservation>): Promise<Reservation> {
  if (USE_MOCKS) {
    await mockDelay(600);
    const newResa: Reservation = {
      id: `R-2026-${String(MOCK_RESERVATIONS.length + 1).padStart(3, '0')}`,
      client: data.client || 'Nouveau Client',
      room: data.room || '101',
      arrival: data.arrival || '2026-07-15',
      departure: data.departure || '2026-07-18',
      regime: data.regime || 'BB',
      segment: data.segment || 'direct',
      status: data.status || 'option',
      total: data.total || '0 DH',
      pax: data.pax || 1,
    };
    MOCK_RESERVATIONS.push(newResa);
    return newResa;
  }

  const payload = {
    room: data.room,
    checkInDate: data.arrival,
    checkOutDate: data.departure,
    boardType: data.regime,
    marketSegment: data.segment,
    adults: data.pax || 1,
    notes: data.notes,
    guest: data.client ? { lastName: data.client } : undefined,
  };

  const res = await apiClient.post('/api/reservations/bookings', payload);
  return mapBookingToFrontend(res.data.booking || res.data);
}

export async function updateReservation(id: string, data: Partial<Reservation>): Promise<Reservation> {
  if (USE_MOCKS) {
    await mockDelay(400);
    const idx = MOCK_RESERVATIONS.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Réservation ${id} introuvable`);
    MOCK_RESERVATIONS[idx] = { ...MOCK_RESERVATIONS[idx], ...data };
    return MOCK_RESERVATIONS[idx];
  }

  if (data.status) {
    const res = await apiClient.patch(`/api/reservations/bookings/${id}/status`, {
      status: STATUS_FE_TO_BE[data.status] || data.status,
    });
    return mapBookingToFrontend(res.data);
  }

  const res = await apiClient.put(`/api/reservations/bookings/${id}`, data);
  return mapBookingToFrontend(res.data);
}

export async function searchClients(query: string): Promise<Client[]> {
  if (USE_MOCKS) {
    await mockDelay(200);
    const q = query.toLowerCase();
    return MOCK_CLIENTS.filter(
      (c) => c.nom.toLowerCase().includes(q) || c.prenom.toLowerCase().includes(q),
    );
  }

  const res = await apiClient.get('/api/reservations/customers/search', { params: { q: query } });
  const customers = Array.isArray(res.data) ? res.data : res.data.customers || [];
  return customers.map((c: any) => ({
    id: c._id || c.id,
    nom: c.lastName || c.nom || '',
    prenom: c.firstName || c.prenom || '',
    email: c.email || '',
    tel: c.phone || c.tel || '',
    notes: c.notes || undefined,
  }));
}
