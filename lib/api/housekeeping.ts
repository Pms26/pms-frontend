// ═══════════════════════════════════════════════════════════
// OASIS PMS — Housekeeping API
// Endpoints: /api/housekeeping/rooms, /update-status
// ═══════════════════════════════════════════════════════════

import apiClient, { USE_MOCKS, mockDelay } from './client';
import type { Room, RoomStatus } from '@/types';

// ─── Mock Data ───────────────────────────────────────────

const MOCK_ROOMS: Room[] = [
  { id: '101', type: 'Standard',     category: 'standard',     floor: 1, status: 'propre' },
  { id: '102', type: 'Standard',     category: 'standard',     floor: 1, status: 'inhouse' },
  { id: '103', type: 'Standard',     category: 'standard',     floor: 1, status: 'sale' },
  { id: '104', type: 'Standard',     category: 'standard',     floor: 1, status: 'bloquee', reason: 'Travaux' },
  { id: '201', type: 'Supérieure',   category: 'superior',     floor: 2, status: 'controlee' },
  { id: '202', type: 'Supérieure',   category: 'superior',     floor: 2, status: 'inhouse' },
  { id: '203', type: 'Supérieure',   category: 'superior',     floor: 2, status: 'encours' },
  { id: '204', type: 'Supérieure',   category: 'superior',     floor: 2, status: 'propre' },
  { id: '205', type: 'Suite',        category: 'suite',        floor: 2, status: 'inhouse' },
  { id: '301', type: 'Suite Deluxe', category: 'suite_deluxe', floor: 3, status: 'propre' },
  { id: '302', type: 'Suite Deluxe', category: 'suite_deluxe', floor: 3, status: 'sale' },
  { id: '303', type: 'Suite Deluxe', category: 'suite_deluxe', floor: 3, status: 'inhouse' },
  { id: '310', type: 'Lodge',        category: 'lodge',        floor: 3, status: 'propre' },
  { id: '311', type: 'Lodge',        category: 'lodge',        floor: 3, status: 'bloquee', reason: 'Day Use' },
  { id: '401', type: 'Villa',        category: 'villa',        floor: 4, status: 'propre' },
  { id: '402', type: 'Villa',        category: 'villa',        floor: 4, status: 'inhouse' },
  { id: '403', type: 'Villa',        category: 'villa',        floor: 4, status: 'encours' },
];

// ─── API Functions ───────────────────────────────────────

export async function getRooms(statusFilter?: RoomStatus): Promise<Room[]> {
  if (USE_MOCKS) {
    await mockDelay();
    if (statusFilter) {
      return MOCK_ROOMS.filter((r) => r.status === statusFilter);
    }
    return MOCK_ROOMS;
  }

  const params = statusFilter ? { status: statusFilter } : {};
  const res = await apiClient.get<Room[]>('/api/housekeeping/rooms', { params });
  return res.data;
}

export async function updateRoomStatus(
  roomId: string,
  status: RoomStatus,
  reason?: string,
): Promise<{ success: boolean; room: Room }> {
  if (USE_MOCKS) {
    await mockDelay(500);
    const roomIndex = MOCK_ROOMS.findIndex((r) => r.id === roomId);
    if (roomIndex === -1) throw new Error(`Chambre ${roomId} introuvable`);

    const updated = { ...MOCK_ROOMS[roomIndex], status, reason: status === 'bloquee' ? reason : undefined };
    MOCK_ROOMS[roomIndex] = updated;
    return { success: true, room: updated };
  }

  const res = await apiClient.put(`/api/housekeeping/rooms/${roomId}/status`, {
    status,
    reason,
  });
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

  const res = await apiClient.get('/api/housekeeping/rooms/summary');
  return res.data;
}
