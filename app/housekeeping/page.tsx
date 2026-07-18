'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Housekeeping (Module 2)
// Reproduction exacte du mockup : rooms-grid, room-card, hk-badge
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRooms } from '@/lib/api/housekeeping';
import type { RoomStatus } from '@/types';
import { useModalToast } from '@/components/context/ModalToastContext';

const HK_STATUS: Record<RoomStatus, { label: string; icon: string; badgeClass: string }> = {
  sale:      { label: 'Sale',      icon: 'bi-exclamation-circle', badgeClass: 'hk-badge hk-sale' },
  encours:   { label: 'En cours',  icon: 'bi-arrow-repeat',       badgeClass: 'hk-badge hk-encours' },
  propre:    { label: 'Propre',    icon: 'bi-check-circle',       badgeClass: 'hk-badge hk-propre' },
  controlee: { label: 'Contrôlée', icon: 'bi-shield-check',       badgeClass: 'hk-badge hk-controlee' },
  bloquee:   { label: 'Bloquée',   icon: 'bi-x-octagon',         badgeClass: 'hk-badge hk-bloquee' },
  inhouse:   { label: 'In-House',  icon: 'bi-person',             badgeClass: 'hk-badge hk-controlee' },
};

const ROOM_ICON: Record<RoomStatus, string> = {
  sale:      'bi-exclamation-triangle',
  encours:   'bi-arrow-repeat',
  propre:    'bi-check2-circle',
  controlee: 'bi-patch-check',
  bloquee:   'bi-lock',
  inhouse:   'bi-person-check',
};

export default function HousekeepingPage() {
  const [filter, setFilter] = useState<RoomStatus | ''>('');
  const { openRoom } = useModalToast();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms', filter],
    queryFn: () => getRooms(filter || undefined),
  });

  return (
    <div>
      {/* ── Section Header ── */}
      <div className="section-header">
        <h2 className="section-title">Housekeeping — Gouvernance</h2>
        <select
          className="form-select form-select-sm pms-input"
          style={{ width: 'auto' }}
          value={filter}
          onChange={(e) => setFilter(e.target.value as RoomStatus | '')}
        >
          <option value="">Tous statuts</option>
          <option value="sale">Sale</option>
          <option value="encours">En cours</option>
          <option value="propre">Propre</option>
          <option value="controlee">Contrôlée</option>
          <option value="bloquee">Bloquée</option>
        </select>
      </div>

      {/* ── Legend ── */}
      <div className="hk-legend mb-3 d-flex flex-wrap gap-2">
        <span className="hk-badge hk-sale"><i className="bi bi-exclamation-circle" /> Sale</span>
        <span className="hk-badge hk-encours"><i className="bi bi-arrow-repeat" /> En cours</span>
        <span className="hk-badge hk-propre"><i className="bi bi-check-circle" /> Propre</span>
        <span className="hk-badge hk-controlee"><i className="bi bi-shield-check" /> Contrôlée</span>
        <span className="hk-badge hk-bloquee"><i className="bi bi-x-octagon" /> Bloquée</span>
      </div>

      {/* ── Rooms Grid ── */}
      {isLoading ? (
        <div className="rooms-grid">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="room-card" style={{ minHeight: 130, opacity: 0.5 }}>
              <div style={{ width: '60%', height: 24, background: 'rgba(15,23,42,0.07)', borderRadius: 4, margin: '0 auto 12px' }} />
              <div style={{ width: '80%', height: 12, background: 'rgba(15,23,42,0.05)', borderRadius: 4, margin: '0 auto 8px' }} />
              <div style={{ width: '50%', height: 20, background: 'rgba(15,23,42,0.05)', borderRadius: 10, margin: '0 auto' }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="rooms-grid">
          {rooms?.map((room) => {
            const cfg = HK_STATUS[room.status] || HK_STATUS.propre;
            const iconClass = ROOM_ICON[room.status] || 'bi-question';
            return (
              <div
                key={room.id}
                className={`room-card ${room.status}`}
                onClick={() => openRoom(room.id, room.status, room.reason)}
                title="Cliquer pour ouvrir la modale de statut"
              >
                <div className="room-icon">
                  <i className={`bi ${iconClass}`} />
                </div>
                <div className="room-number">{room.id}</div>
                <div className="room-type">{room.type}</div>
                <span className={cfg.badgeClass} style={{ fontSize: '0.68rem', marginTop: '0.5rem', display: 'inline-flex' }}>
                  {cfg.label}
                </span>
                {room.reason && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 4, fontStyle: 'italic' }}>
                    {room.reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
