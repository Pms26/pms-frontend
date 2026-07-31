'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Housekeeping (Module 2)
// Reproduction exacte du mockup : rooms-grid, room-card, hk-badge
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRooms } from '@/lib/api/housekeeping';
import type { HousekeepingStatus } from '@/types';
import { useModalToast } from '@/components/context/ModalToastContext';

const HK_STATUS: Record<HousekeepingStatus, { label: string; icon: string; badgeClass: string }> = {
  sale:               { label: 'Sale',               icon: 'bi-exclamation-circle', badgeClass: 'hk-badge hk-sale' },
  nettoyage_en_cours: { label: 'En cours',           icon: 'bi-arrow-repeat',       badgeClass: 'hk-badge hk-encours' },
  propre:             { label: 'Propre',             icon: 'bi-check-circle',       badgeClass: 'hk-badge hk-propre' },
  controlee:          { label: 'Contrôlée',          icon: 'bi-shield-check',       badgeClass: 'hk-badge hk-controlee' },
  bloquee:            { label: 'Bloquée',            icon: 'bi-x-octagon',          badgeClass: 'hk-badge hk-bloquee' },
};

const ROOM_ICON: Record<HousekeepingStatus, string> = {
  sale:               'bi-exclamation-triangle',
  nettoyage_en_cours: 'bi-arrow-repeat',
  propre:             'bi-check2-circle',
  controlee:          'bi-patch-check',
  bloquee:            'bi-lock',
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  standard: 'Standard',
  superior: 'Supérieure',
  suite: 'Suite',
  suite_deluxe: 'Suite Deluxe',
  lodge: 'Lodge',
  villa: 'Villa',
};

export default function HousekeepingPage() {
  const [filter, setFilter] = useState<HousekeepingStatus | ''>('');
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
          onChange={(e) => setFilter(e.target.value as HousekeepingStatus | '')}
        >
          <option value="">Tous statuts</option>
          <option value="sale">Sale</option>
          <option value="nettoyage_en_cours">En cours</option>
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
            const cfg = HK_STATUS[room.housekeepingStatus] || HK_STATUS.propre;
            const iconClass = ROOM_ICON[room.housekeepingStatus] || 'bi-question';
            return (
              <div
                key={room.id}
                className={`room-card ${room.housekeepingStatus}`}
                onClick={() => openRoom(room.id, room.housekeepingStatus, room.blockReason ?? undefined)}
                title="Cliquer pour ouvrir la modale de statut"
              >
                <div className="room-icon">
                  <i className={`bi ${iconClass}`} />
                </div>
                <div className="room-number">{room.roomNumber}</div>
                <div className="room-type">{ROOM_TYPE_LABELS[room.category] || room.category}</div>
                <span className={cfg.badgeClass} style={{ fontSize: '0.68rem', marginTop: '0.5rem', display: 'inline-flex' }}>
                  {cfg.label}
                </span>
                {room.blockReason && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 4, fontStyle: 'italic' }}>
                    {room.blockReason}
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
