// ═══════════════════════════════════════════════════════════
// OASIS PMS — Housekeeping API
// Backend: service-housekeeping (port 4002) via gateway
// Routes: GET /api/rooms, PATCH /api/rooms/numero/:numero/status
// ═══════════════════════════════════════════════════════════

import apiClient, { USE_MOCKS, mockDelay } from './client';
import type { Room, RoomStatus } from '@/types';

const MOCK_ROOMS: Room[] = [
  { id: '101', type: 'Standard', category: 'standard', floor: 1, status: 'propre' },
  { id: '102', type: 'Standard', category: 'standard', floor: 1, status: 'inhouse' },
  { id: '103', type: 'Standard', category: 'standard', floor: 1, status: 'sale' },
  { id: '104', type: 'Standard', category: 'standard', floor: 1, status: 'bloquee', reason: 'Travaux' },
  { id: '201', type: 'Supérieure', category: 'superior', floor: 2, status: 'controlee' },
  { id: '202', type: 'Supérieure', category: 'superior', floor: 2, status: 'inhouse' },
  { id: '203', type: 'Supérieure', category: 'superior', floor: 2, status: 'encours' },
  { id: '204', type: 'Supérieure', category: 'superior', floor: 2, status: 'propre' },
  { id: '205', type: 'Suite', category: 'suite', floor: 2, status: 'inhouse' },
  { id: '301', type: 'Suite Deluxe', category: 'suite_deluxe', floor: 3, status: 'propre' },
  { id: '302', type: 'Suite Deluxe', category: 'suite_deluxe', floor: 3, status: 'sale' },
  { id: '303', type: 'Suite Deluxe', category: 'suite_deluxe', floor: 3, status: 'inhouse' },
  { id: '310', type: 'Lodge', category: 'lodge', floor: 3, status: 'propre' },
  { id: '311', type: 'Lodge', category: 'lodge', floor: 3, status: 'bloquee', reason: 'Day Use' },
  { id: '401', type: 'Villa', category: 'villa', floor: 4, status: 'propre' },
  { id: '402', type: 'Villa', category: 'villa', floor: 4, status: 'inhouse' },
  { id: '403', type: 'Villa', category: 'villa', floor: 4, status: 'encours' },
];

const STATUS_MAP_BE_TO_FE: Record<string, RoomStatus> = {
  sale: 'sale',
  propre: 'propre',
  controlee: 'controlee',
  bloquee: 'bloquee',
  inhouse: 'inhouse',
  encours: 'encours',
  nettoyage_en_cours: 'encours',
};

const CATEGORY_MAP_BE_TO_FE: Record<string, string> = {
  standard: 'Standard',
  superior: 'Supérieure',
  suite: 'Suite',
  suite_deluxe: 'Suite Deluxe',
  lodge: 'Lodge',
  villa: 'Villa',
};

const STATUS_MAP_FE_TO_BE: Record<string, string> = {
  sale: 'sale',
  propre: 'propre',
  controlee: 'controlee',
  bloquee: 'bloquee',
  encours: 'nettoyage_en_cours',
};

export async function getRooms(statusFilter?: RoomStatus): Promise<Room[]> {
  if (USE_MOCKS) {
    await mockDelay();
    if (statusFilter) return MOCK_ROOMS.filter((r) => r.status === statusFilter);
    return MOCK_ROOMS;
  }

  const res = await apiClient.get('/api/housekeeping/rooms');
  const data = res.data;
  const roomsRaw = data.rooms || data;

  const rooms: Room[] = roomsRaw.map((r: any) => ({
    id: r.number || r.numero || r.roomNumber || r.id,
    type: CATEGORY_MAP_BE_TO_FE[r.categorie || r.category] || r.categorie || r.category || 'Standard',
    category: (r.categorie || r.category || 'standard') as Room['category'],
    floor: r.etage || r.floor || 1,
    status: STATUS_MAP_BE_TO_FE[r.statut || r.housekeepingStatus || r.status] || 'propre',
    reason: r.motifBlocage || r.blockReason || undefined,
  }));

  if (statusFilter) return rooms.filter((r) => r.status === statusFilter);
  return rooms;
}

export async function updateRoomStatus(
  roomNumber: string,
  status: RoomStatus,
  reason?: string,
): Promise<{ success: boolean; room: Room }> {
  if (USE_MOCKS) {
    await mockDelay(500);
    const idx = MOCK_ROOMS.findIndex((r) => r.id === roomNumber);
    if (idx === -1) throw new Error(`Chambre ${roomNumber} introuvable`);
    const updated = { ...MOCK_ROOMS[idx], status, reason: status === 'bloquee' ? reason : undefined };
    MOCK_ROOMS[idx] = updated;
    return { success: true, room: updated };
  }

  const res = await apiClient.patch(`/api/housekeeping/rooms/numero/${roomNumber}/status`, {
    statut: STATUS_MAP_FE_TO_BE[status] || status,
    motifBlocage: status === 'bloquee' ? reason : undefined,
  });
  const data = res.data;
  return {
    success: true,
    room: {
      id: data.number || data.numero || data.roomNumber || roomNumber,
      type: CATEGORY_MAP_BE_TO_FE[data.categorie || data.category] || 'Standard',
      category: (data.categorie || data.category || 'standard') as Room['category'],
      floor: data.etage || data.floor || 1,
      status,
      reason: data.motifBlocage || data.blockReason,
    },
  };
}

export async function checkoutRoom(roomNumber: string): Promise<{ message: string; room: Room }> {
  const res = await apiClient.patch(`/api/housekeeping/rooms/numero/${roomNumber}/checkout`);
  const data = res.data;
  return {
    message: data.message,
    room: {
      id: data.room?.number || data.room?.numero || data.room?.roomNumber || roomNumber,
      type: CATEGORY_MAP_BE_TO_FE[data.room?.categorie || data.room?.category] || 'Standard',
      category: (data.room?.categorie || data.room?.category || 'standard') as Room['category'],
      floor: data.room?.etage || data.room?.floor || 1,
      status: 'sale',
      reason: undefined,
    },
  };
}

export async function triggerNightAudit(): Promise<{ message: string; chambresModifiees: number }> {
  const res = await apiClient.post('/api/housekeeping/rooms/night-audit');
  return res.data;
}

export async function getRoomsSummary(): Promise<Record<RoomStatus, number>> {
  if (USE_MOCKS) {
    await mockDelay(200);
    const summary: Record<string, number> = {};
    for (const room of MOCK_ROOMS) {
      summary[room.status] = (summary[room.status] || 0) + 1;
    }
    return summary as Record<RoomStatus, number>;
  }

  const rooms = await getRooms();
  const summary: Record<string, number> = {};
  for (const room of rooms) {
    summary[room.status] = (summary[room.status] || 0) + 1;
  }
  return summary as Record<RoomStatus, number>;
}