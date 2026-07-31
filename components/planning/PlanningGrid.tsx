'use client';

import { useEffect, useState } from 'react';
import { getRooms } from '@/lib/api/housekeeping';
import { getReservations } from '@/lib/api/reservations';
import { useModalToast } from '@/components/context/ModalToastContext';
import type { Room } from '@/types';

const STATUS_COLORS_PLAN: Record<string, string> = {
  option: '#6366f1', confirmed: '#10b981', voucher: '#f59e0b',
  inhouse: '#06b6d4', checkout: '#6b7280', noshow: '#ef4444', cancelled: '#374151'
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  standard: 'Standard',
  superior: 'Supérieure',
  suite: 'Suite',
  suite_deluxe: 'Suite Deluxe',
  lodge: 'Lodge',
  villa: 'Villa',
};

interface Reservation {
  id: string;
  client: string;
  room: string;
  arrival: string;
  departure: string;
  status: string;
}

export default function PlanningGrid() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [days, setDays] = useState<Date[]>([]);
  const [rangeLabel, setRangeLabel] = useState('');
  const { openReservation } = useModalToast();

  useEffect(() => {
    let mounted = true;
    async function load() {
      const rs = await getRooms();
      const res = await getReservations();
      if (!mounted) return;
      setRooms(rs);
      setReservations(res);
    }
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const baseDate = new Date(2026, 6, 8 + weekOffset * 7);
    const newDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      return d;
    });
    setDays(newDays);

    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
    setRangeLabel(`${fmt(newDays[0])} – ${fmt(newDays[6])} 2026`);
  }, [weekOffset]);

  const getReservationForCell = (roomId: string, date: Date): Reservation | undefined => {
    const dateStr = date.toISOString().split('T')[0];
    return reservations.find(
      (r) => r.room === roomId && r.arrival <= dateStr && r.departure > dateStr
    );
  };

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();  // Build grid children: all as direct children of grid container
  // Grid auto-flows: 8 columns (120px + 7×1fr), wraps to new row when full
  const gridChildren: React.ReactNode[] = [];

  // Add header row (8 cells total)
  gridChildren.push(
    <div
      key="header-chambre"
      className="planning-cell-header"
      style={{ minWidth: '120px' }}
    >
      Chambre
    </div>
  );
  days.forEach((day, idx) => {
    gridChildren.push(
      <div
        key={`header-day-${idx}`}
        className="planning-cell-header"
        style={
          isToday(day)
            ? { color: '#6366f1', background: 'rgba(99,102,241,0.1)' }
            : {}
        }
      >
        <div style={{ fontSize: '0.7rem' }}>
          {day.toLocaleDateString('fr-FR', { weekday: 'short' }).toUpperCase()}
        </div>
        <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>
          {day.getDate()}
        </div>
      </div>
    );
  });

  // Add room rows (8 cells per room: label + 7 day cells)
  rooms.forEach((room) => {
    // Room label cell (first column)
    gridChildren.push(
      <div
        key={`room-label-${room.id}`}
        className="planning-room-label"
      >
        <span style={{ fontSize: '0.85rem' }}>Ch. {room.roomNumber}</span>
        <small style={{ color: room.housekeepingStatus || 'propre' }}>{ROOM_TYPE_LABELS[room.category] || room.category}</small>
      </div>
    );

    // 7 day cells for this room
    days.forEach((day, dayIdx) => {
      const res = getReservationForCell(room.roomNumber, day);
      const cellToday = isToday(day);
      const resColor = res ? (STATUS_COLORS_PLAN[res.status] || '#6366f1') : undefined;

      gridChildren.push(
        <div
          key={`cell-${room.id}-${dayIdx}`}
          className="planning-cell"
          style={cellToday ? { background: 'rgba(99,102,241,0.04)' } : {}}
        >
          {res && (
            <div
              className="res-block"
              style={{
                background: resColor,
                left: '2px',
                right: '2px',
              }}
              title={`${res.client} — ${res.status}`}
            >
              {res.client.split(' ')[0]}
            </div>
          )}
        </div>
      );
    });
  });

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Planning des Chambres</h2>
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset((w) => w - 1)}>
            <i className="bi bi-chevron-left"></i>
          </button>
          <span className="fw-600" id="planningRange">{rangeLabel}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset((w) => w + 1)}>
            <i className="bi bi-chevron-right"></i>
          </button>
          <button className="btn btn-pms btn-sm ms-2" onClick={() => openReservation()}>
            <i className="bi bi-plus-lg me-1"></i>Nouvelle réservation
          </button>
        </div>
      </div>

      <div className="planning-legend mb-3 d-flex flex-wrap gap-2">
        <span className="legend-badge" style={{ ['--c' as any]: '#6366f1' } as any}>
          Option/Provisoire
        </span>
        <span className="legend-badge" style={{ ['--c' as any]: '#10b981' } as any}>
          Confirmée
        </span>
        <span className="legend-badge" style={{ ['--c' as any]: '#f59e0b' } as any}>
          Garantie Agence
        </span>
        <span className="legend-badge" style={{ ['--c' as any]: '#06b6d4' } as any}>
          In-House
        </span>
        <span className="legend-badge" style={{ ['--c' as any]: '#ef4444' } as any}>
          No-Show
        </span>
        <span className="legend-badge" style={{ ['--c' as any]: '#6b7280' } as any}>
          Annulée
        </span>
      </div>

      <div className="planning-wrapper glass-card p-3">
        <div className="planning-grid" id="planningGrid" style={{ display: 'grid', gridTemplateColumns: `120px repeat(7, 1fr)` }}>
          {gridChildren}
        </div>
      </div>
    </div>
  );
}
