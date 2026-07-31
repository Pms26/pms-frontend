'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRooms, getRoomsByStatus, getRoom, updateRoomStatus } from '@/lib/api/frontOffice';
import { useAuthStore } from '@/lib/auth/AuthContext';
import { useModalToast } from '@/components/context/ModalToastContext';
import { ROOM_STATUS_CONFIG } from '@/types';
import type { HousekeepingStatus, Room } from '@/types';

const HOUSEKEEPING_STATUSES: HousekeepingStatus[] = [
  'sale',
  'nettoyage_en_cours',
  'propre',
  'controlee',
  'bloquee',
];

const CATEGORY_LABELS: Record<string, string> = {
  standard: 'Standard',
  superior: 'Supérieure',
  suite: 'Suite',
  suite_deluxe: 'Suite Deluxe',
  lodge: 'Lodge',
  villa: 'Villa',
};

const CAN_UPDATE_ROLE = ['admin', 'manager', 'housekeeping_supervisor'];

export default function RoomList() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const canUpdateStatus = !!role && CAN_UPDATE_ROLE.includes(role);

  const [filter, setFilter] = useState<HousekeepingStatus | ''>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<HousekeepingStatus>('propre');
  const [blockReason, setBlockReason] = useState('');

  const { showToast } = useModalToast();
  const queryClient = useQueryClient();

  const roomsQuery = useQuery({
    queryKey: ['fo-rooms', filter],
    queryFn: () => (filter ? getRoomsByStatus(filter) : getRooms()),
  });

  const roomDetailQuery = useQuery({
    queryKey: ['fo-room', selectedRoomId],
    queryFn: () => getRoom(selectedRoomId!),
    enabled: !!selectedRoomId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (vars: { roomId: string; status: HousekeepingStatus; blockReason?: string }) =>
      updateRoomStatus(vars.roomId, vars.status, vars.blockReason),
    onSuccess: (updatedRoom) => {
      queryClient.invalidateQueries({ queryKey: ['fo-rooms'] });
      queryClient.invalidateQueries({ queryKey: ['fo-room', updatedRoom.id] });
      setBlockReason('');
      showToast(`✅ Statut de la chambre ${updatedRoom.roomNumber} mis à jour`);
    },
    onError: (error: Error) => {
      showToast(`⚠️ ${error.message}`);
    },
  });

  const rooms = roomsQuery.data ?? [];

  const handleSelectRoom = (room: Room) => {
    setSelectedRoomId(room.id);
    setNewStatus(room.housekeepingStatus);
    setBlockReason(room.blockReason ?? '');
  };

  const handleApplyStatus = () => {
    if (!selectedRoomId) return;
    if (newStatus === 'bloquee' && !blockReason.trim()) {
      showToast('⚠️ Le motif de blocage est obligatoire pour le statut « Bloquée ».');
      return;
    }
    updateStatusMutation.mutate({
      roomId: selectedRoomId,
      status: newStatus,
      blockReason: newStatus === 'bloquee' ? blockReason : undefined,
    });
  };

  const detail = roomDetailQuery.data;

  return (
    <div className="glass-card p-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h6 className="fw-600 mb-0">Chambres</h6>
        <select
          className="form-select form-select-sm pms-input"
          style={{ width: 'auto' }}
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as HousekeepingStatus | '');
            setSelectedRoomId(null);
          }}
        >
          <option value="">Tous les statuts</option>
          {HOUSEKEEPING_STATUSES.map((status) => (
            <option key={status} value={status}>
              {ROOM_STATUS_CONFIG[status].label}
            </option>
          ))}
        </select>
      </div>

      {roomsQuery.isLoading ? (
        <div className="text-muted py-3">Chargement des chambres...</div>
      ) : roomsQuery.isError ? (
        <div className="alert-security mb-2">
          <i className="bi bi-exclamation-triangle me-2" />
          {roomsQuery.error.message}
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-muted py-3">Aucune chambre</div>
      ) : (
        <div className="d-flex flex-column gap-2 mb-3" style={{ maxHeight: 320, overflowY: 'auto' }}>
          {rooms.map((room) => {
            const cfg = ROOM_STATUS_CONFIG[room.housekeepingStatus];
            return (
              <div
                key={room.id}
                className={`checkin-item ${selectedRoomId === room.id ? 'active' : ''}`}
                style={
                  selectedRoomId === room.id
                    ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 1px rgba(99,102,241,0.4)' }
                    : undefined
                }
                onClick={() => handleSelectRoom(room)}
              >
                <span className="checkin-room-badge">Ch. {room.roomNumber}</span>
                <div className="flex-1">
                  <div className="checkin-name">
                    {CATEGORY_LABELS[room.category] || room.category} — étage {room.floor}
                  </div>
                  <div className="checkin-details">
                    {room.bedType} · {room.maxOccupancy} pers.
                  </div>
                </div>
                <span className={`hk-badge hk-${room.housekeepingStatus === 'nettoyage_en_cours' ? 'encours' : room.housekeepingStatus}`}>
                  <i className={`bi ${cfg.icon} me-1`} />
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {selectedRoomId && (
        <div className="border-top pt-3">
          {roomDetailQuery.isLoading ? (
            <div className="text-muted">Chargement du détail...</div>
          ) : roomDetailQuery.isError ? (
            <div className="alert-security mb-0">
              <i className="bi bi-exclamation-triangle me-2" />
              {roomDetailQuery.error.message}
            </div>
          ) : detail ? (
            <>
              <h6 className="fw-600 mb-2">
                Chambre {detail.roomNumber}{' '}
                <span className="text-muted" style={{ fontWeight: 400 }}>
                  · {CATEGORY_LABELS[detail.category] || detail.category}
                </span>
              </h6>
              <div className="small text-muted mb-3">
                Étage {detail.floor} · {detail.bedType} · Capacité {detail.maxOccupancy} pers.
                {detail.blockReason ? ` · Motif: ${detail.blockReason}` : ''}
              </div>

              {canUpdateStatus ? (
                <div className="d-flex flex-column gap-2">
                  <select
                    className="form-select form-select-sm pms-input"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as HousekeepingStatus)}
                  >
                    {HOUSEKEEPING_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {ROOM_STATUS_CONFIG[status].label}
                      </option>
                    ))}
                  </select>
                  {newStatus === 'bloquee' && (
                    <input
                      type="text"
                      className="form-control form-control-sm pms-input"
                      placeholder="Motif de blocage *"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                    />
                  )}
                  <button
                    type="button"
                    className="btn btn-pms btn-sm"
                    onClick={handleApplyStatus}
                    disabled={updateStatusMutation.status === 'pending'}
                  >
                    {updateStatusMutation.status === 'pending' ? 'Mise à jour...' : 'Mettre à jour le statut'}
                  </button>
                </div>
              ) : (
                <div className="text-muted small">
                  Lecture seule — vous n'avez pas les droits de modification du statut.
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
