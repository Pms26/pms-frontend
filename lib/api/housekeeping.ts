// ═══════════════════════════════════════════════════════════
// OASIS PMS — Housekeeping API
// Backend: service-housekeeping (port 4002) via gateway
// Routes: GET /api/rooms, PATCH /api/rooms/:id/status
// ═══════════════════════════════════════════════════════════

import apiClient, { USE_MOCKS, mockDelay } from './client';
import type { Room, HousekeepingStatus } from '@/types';

const MOCK_ROOMS: Room[] = [
  { id: '101', roomNumber: '101', category: 'standard', floor: 1, bedType: 'double', maxOccupancy: 2, housekeepingStatus: 'propre', blockReason: null },
  { id: '102', roomNumber: '102', category: 'standard', floor: 1, bedType: 'double', maxOccupancy: 2, housekeepingStatus: 'sale', blockReason: null },
  { id: '103', roomNumber: '103', category: 'standard', floor: 1, bedType: 'double', maxOccupancy: 2, housekeepingStatus: 'sale', blockReason: null },
  { id: '104', roomNumber: '104', category: 'standard', floor: 1, bedType: 'double', maxOccupancy: 2, housekeepingStatus: 'bloquee', blockReason: 'Travaux' },
  { id: '201', roomNumber: '201', category: 'superior', floor: 2, bedType: 'double', maxOccupancy: 2, housekeepingStatus: 'controlee', blockReason: null },
  { id: '202', roomNumber: '202', category: 'superior', floor: 2, bedType: 'double', maxOccupancy: 2, housekeepingStatus: 'sale', blockReason: null },
  { id: '203', roomNumber: '203', category: 'superior', floor: 2, bedType: 'double', maxOccupancy: 2, housekeepingStatus: 'nettoyage_en_cours', blockReason: null },
  { id: '204', roomNumber: '204', category: 'superior', floor: 2, bedType: 'double', maxOccupancy: 2, housekeepingStatus: 'propre', blockReason: null },
  { id: '205', roomNumber: '205', category: 'suite', floor: 2, bedType: 'double', maxOccupancy: 2, housekeepingStatus: 'sale', blockReason: null },
  { id: '301', roomNumber: '301', category: 'suite_deluxe', floor: 3, bedType: 'double', maxOccupancy: 3, housekeepingStatus: 'propre', blockReason: null },
  { id: '302', roomNumber: '302', category: 'suite_deluxe', floor: 3, bedType: 'double', maxOccupancy: 3, housekeepingStatus: 'sale', blockReason: null },
  { id: '303', roomNumber: '303', category: 'suite_deluxe', floor: 3, bedType: 'double', maxOccupancy: 3, housekeepingStatus: 'sale', blockReason: null },
  { id: '310', roomNumber: '310', category: 'lodge', floor: 3, bedType: 'double', maxOccupancy: 2, housekeepingStatus: 'propre', blockReason: null },
  { id: '311', roomNumber: '311', category: 'lodge', floor: 3, bedType: 'double', maxOccupancy: 2, housekeepingStatus: 'bloquee', blockReason: 'Day Use' },
  { id: '401', roomNumber: '401', category: 'villa', floor: 4, bedType: 'double', maxOccupancy: 4, housekeepingStatus: 'propre', blockReason: null },
  { id: '402', roomNumber: '402', category: 'villa', floor: 4, bedType: 'double', maxOccupancy: 4, housekeepingStatus: 'sale', blockReason: null },
  { id: '403', roomNumber: '403', category: 'villa', floor: 4, bedType: 'double', maxOccupancy: 4, housekeepingStatus: 'nettoyage_en_cours', blockReason: null },
];

const STATUS_MAP_BE_TO_FE: Record<string, HousekeepingStatus> = {
  sale: 'sale',
  propre: 'propre',
  controlee: 'controlee',
  bloquee: 'bloquee',
  nettoyage_en_cours: 'nettoyage_en_cours',
};

const STATUS_MAP_FE_TO_BE: Record<string, string> = {
  sale: 'sale',
  propre: 'propre',
  controlee: 'controlee',
  bloquee: 'bloquee',
  nettoyage_en_cours: 'nettoyage_en_cours',
};

export async function getRooms(statusFilter?: HousekeepingStatus): Promise<Room[]> {
  if (USE_MOCKS) {
    await mockDelay();
    if (statusFilter) return MOCK_ROOMS.filter((r) => r.housekeepingStatus === statusFilter);
    return MOCK_ROOMS;
  }

  const res = await apiClient.get('/api/housekeeping/rooms');
  const data = res.data;
  const roomsRaw = data.rooms || data;

  const rooms: Room[] = roomsRaw.map((r: any) => ({
    id: r.id || r.numero || r.roomNumber,
    roomNumber: r.numero || r.roomNumber || r.id,
    category: (r.categorie || r.category || 'standard') as Room['category'],
    floor: r.etage || r.floor || 1,
    bedType: r.typeDeLit || r.bedType || 'double',
    maxOccupancy: r.capacite || r.maxOccupancy || 2,
    housekeepingStatus: STATUS_MAP_BE_TO_FE[r.statut || r.housekeepingStatus || r.status] || 'propre',
    blockReason: r.motifBlocage || r.blockReason || null,
  }));

  if (statusFilter) return rooms.filter((r) => r.housekeepingStatus === statusFilter);
  return rooms;
}

export async function updateRoomStatus(
  roomId: string,
  status: HousekeepingStatus,
  reason?: string,
): Promise<{ success: boolean; room: Room }> {
  if (USE_MOCKS) {
    await mockDelay(500);
    const idx = MOCK_ROOMS.findIndex((r) => r.id === roomId);
    if (idx === -1) throw new Error(`Chambre ${roomId} introuvable`);
    const updated = {
      ...MOCK_ROOMS[idx],
      housekeepingStatus: status,
      blockReason: status === 'bloquee' ? reason ?? null : null,
    };
    MOCK_ROOMS[idx] = updated;
    return { success: true, room: updated };
  }

  const res = await apiClient.patch(`/api/housekeeping/rooms/${roomId}/status`, {
    housekeepingStatus: STATUS_MAP_FE_TO_BE[status] || status,
    blockReason: status === 'bloquee' ? reason : undefined,
  });
  const data = res.data;
  return {
    success: true,
    room: {
      id: data.room?.id || data.room?.numero || data.room?.roomNumber || roomId,
      roomNumber: data.room?.numero || data.room?.roomNumber || roomId,
      category: (data.room?.categorie || data.room?.category || 'standard') as Room['category'],
      floor: data.room?.etage || data.room?.floor || 1,
      bedType: data.room?.typeDeLit || data.room?.bedType || 'double',
      maxOccupancy: data.room?.capacite || data.room?.maxOccupancy || 2,
      housekeepingStatus: status,
      blockReason: data.room?.motifBlocage || data.room?.blockReason || null,
    },
  };
}

export async function getRoomsSummary(): Promise<Record<HousekeepingStatus, number>> {
  if (USE_MOCKS) {
    await mockDelay(200);
    const summary: Record<string, number> = {};
    for (const room of MOCK_ROOMS) {
      summary[room.housekeepingStatus] = (summary[room.housekeepingStatus] || 0) + 1;
    }
    return summary as Record<HousekeepingStatus, number>;
  }

  const rooms = await getRooms();
  const summary: Record<string, number> = {};
  for (const room of rooms) {
    summary[room.housekeepingStatus] = (summary[room.housekeepingStatus] || 0) + 1;
  }
  return summary as Record<HousekeepingStatus, number>;
}
