// ═══════════════════════════════════════════════════════════
// OASIS PMS — Reservations API
// Endpoints: /api/reservations, /api/reservations/:id
// ═══════════════════════════════════════════════════════════

import apiClient, { USE_MOCKS, mockDelay } from './client';
import type { Reservation, ReservationStatus, MarketSegment, Client } from '@/types';

// ─── Mock Data ───────────────────────────────────────────

const MOCK_RESERVATIONS: Reservation[] = [
  { id: 'R-2026-001', client: 'Alami Karim',     room: '201', arrival: '2026-07-08', departure: '2026-07-12', regime: 'BB', segment: 'direct', status: 'inhouse',   total: '6 800 DH', pax: 2 },
  { id: 'R-2026-002', client: 'Benali Sophia',   room: '205', arrival: '2026-07-08', departure: '2026-07-10', regime: 'PC', segment: 'ota',    status: 'inhouse',   total: '5 200 DH', pax: 2 },
  { id: 'R-2026-003', client: 'Cherkaoui Y.',    room: '102', arrival: '2026-07-09', departure: '2026-07-14', regime: 'DP', segment: 'b2b',    status: 'confirmed', total: '8 400 DH', pax: 2 },
  { id: 'R-2026-004', client: 'Idrissi Nadia',   room: '301', arrival: '2026-07-09', departure: '2026-07-11', regime: 'BB', segment: 'direct', status: 'confirmed', total: '4 200 DH', pax: 1 },
  { id: 'R-2026-005', client: 'Martin Julie',    room: '310', arrival: '2026-07-10', departure: '2026-07-15', regime: 'BB', segment: 'ota',    status: 'option',    total: '9 500 DH', pax: 2 },
  { id: 'R-2026-006', client: 'Hassan Ahmed',    room: '402', arrival: '2026-07-08', departure: '2026-07-09', regime: 'BB', segment: 'b2b',    status: 'checkout',  total: '2 100 DH', pax: 1 },
  { id: 'R-2026-007', client: 'Fassi Omar',      room: '103', arrival: '2026-07-07', departure: '2026-07-08', regime: 'BB', segment: 'direct', status: 'noshow',    total: '1 400 DH', pax: 1 },
  { id: 'R-2026-008', client: 'Dupont Pierre',   room: '202', arrival: '2026-07-11', departure: '2026-07-14', regime: 'DP', segment: 'ota',    status: 'confirmed', total: '5 600 DH', pax: 2 },
  { id: 'R-2026-009', client: 'García Maria',    room: '303', arrival: '2026-07-08', departure: '2026-07-13', regime: 'PC', segment: 'direct', status: 'inhouse',   total: '9 800 DH', pax: 2 },
  { id: 'R-2026-010', client: 'El Mansouri R.',  room: '401', arrival: '2026-07-12', departure: '2026-07-16', regime: 'BB', segment: 'b2b',    status: 'voucher',   total: '7 200 DH', pax: 3 },
];

const MOCK_CLIENTS: Client[] = [
  { id: 1, nom: 'Alami',     prenom: 'Karim',   email: 'k.alami@email.ma',     tel: '+212 661 000 001', notes: 'Client VIP — Préfère chambre haute' },
  { id: 2, nom: 'Benali',    prenom: 'Sophia',  email: 's.benali@email.ma',     tel: '+212 661 000 002', notes: 'Allergique au gluten' },
  { id: 3, nom: 'Cherkaoui', prenom: 'Yassine', email: 'y.cherkaoui@email.ma',  tel: '+212 661 000 003' },
  { id: 4, nom: 'Idrissi',   prenom: 'Nadia',   email: 'n.idrissi@email.ma',    tel: '+212 661 000 004', notes: 'Client régulier — Lit king' },
  { id: 5, nom: 'Fassi',     prenom: 'Omar',    email: 'o.fassi@email.ma',      tel: '+212 661 000 005' },
  { id: 6, nom: 'Martin',    prenom: 'Julie',   email: 'j.martin@email.fr',     tel: '+33 6 12 34 56 78', notes: 'Touriste français' },
  { id: 7, nom: 'Hassan',    prenom: 'Ahmed',   email: 'a.hassan@email.ma',     tel: '+212 661 000 007', notes: 'Réservation agence Maroc Tours' },
];

// ─── API Functions ───────────────────────────────────────

interface ReservationFilters {
  search?: string;
  status?: ReservationStatus;
  segment?: MarketSegment;
}

export async function getReservations(filters?: ReservationFilters): Promise<Reservation[]> {
  if (USE_MOCKS) {
    await mockDelay();
    let result = [...MOCK_RESERVATIONS];

    if (filters?.status) {
      result = result.filter((r) => r.status === filters.status);
    }
    if (filters?.segment) {
      result = result.filter((r) => r.segment === filters.segment);
    }
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.client.toLowerCase().includes(s) ||
          r.room.includes(s) ||
          r.id.toLowerCase().includes(s)
      );
    }

    return result;
  }

  const res = await apiClient.get<Reservation[]>('/api/reservations', { params: filters });
  return res.data;
}

export async function getReservation(id: string): Promise<Reservation> {
  if (USE_MOCKS) {
    await mockDelay(200);
    const resa = MOCK_RESERVATIONS.find((r) => r.id === id);
    if (!resa) throw new Error(`Réservation ${id} introuvable`);
    return resa;
  }

  const res = await apiClient.get<Reservation>(`/api/reservations/${id}`);
  return res.data;
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

  const res = await apiClient.post<Reservation>('/api/reservations', data);
  return res.data;
}

export async function updateReservation(id: string, data: Partial<Reservation>): Promise<Reservation> {
  if (USE_MOCKS) {
    await mockDelay(400);
    const idx = MOCK_RESERVATIONS.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Réservation ${id} introuvable`);
    MOCK_RESERVATIONS[idx] = { ...MOCK_RESERVATIONS[idx], ...data };
    return MOCK_RESERVATIONS[idx];
  }

  const res = await apiClient.put<Reservation>(`/api/reservations/${id}`, data);
  return res.data;
}

export async function searchClients(query: string): Promise<Client[]> {
  if (USE_MOCKS) {
    await mockDelay(200);
    const q = query.toLowerCase();
    return MOCK_CLIENTS.filter(
      (c) => c.nom.toLowerCase().includes(q) || c.prenom.toLowerCase().includes(q)
    );
  }

  const res = await apiClient.get<Client[]>('/api/reservations/clients/search', { params: { q: query } });
  return res.data;
}
