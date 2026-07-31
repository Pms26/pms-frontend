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
  reference?: string;
  client: string;
  room: string;
  arrival: string;
  departure: string;
  status: string;
}

// Renvoie le lundi de la semaine contenant la date donnée
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = dimanche, 1 = lundi, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
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
      console.log('ROOMS:', rs);
      console.log('RESERVATIONS:', res);
      setRooms(rs);
      setReservations(res);
    }
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    // Semaine réelle actuelle, décalée par weekOffset semaines
    const baseMonday = getMonday(new Date());
    baseMonday.setDate(baseMonday.getDate() + weekOffset * 7);

    const newDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(baseMonday);
      d.setDate(d.getDate() + i);
      return d;
    });
    setDays(newDays);

    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
    const year = newDays[0].getFullYear();
    setRangeLabel(`${fmt(newDays[0])} – ${fmt(newDays[6])} ${year}`);
  }, [weekOffset]);

  const getReservationForCell = (roomId: string, date: Date): Reservation | undefined => {
    const dateStr = date.toISOString().split('T')[0];
    return reservations.find(
      (r) => r.room === roomId && r.arrival <= dateStr && r.departure > dateStr
    );
  };

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();


  const gridChildren: React.ReactNode[] = [];

  gridChildren.push(
    <div key="header-chambre" className="planning-cell-header" style={{ minWidth: '120px' }}>
      Chambre
    </div>
  );
  days.forEach((day, idx) => {
    gridChildren.push(
      <div
        key={`header-day-${idx}`}
        className="planning-cell-header"
        style={isToday(day) ? { color: '#6366f1', background: 'rgba(99,102,241,0.1)' } : {}}
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

  rooms.forEach((room) => {
    gridChildren.push(
      <div key={`room-label-${room.id}`} className="planning-room-label">
        <span style={{ fontSize: '0.85rem' }}>Ch. {room.id}</span>
        <small style={{ color: room.status || 'propre' }}>{room.type}</small>
      </div>
    );

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
                cursor: 'pointer',
              }}
              title={`${res.client} — clic pour ouvrir le dossier`}
              onClick={() => openReservation(res.id)}
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
          {weekOffset !== 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setWeekOffset(0)}>
              Aujourd'hui
            </button>
          )}
          <button className="btn btn-pms btn-sm ms-2" onClick={() => openReservation()}>
            <i className="bi bi-plus-lg me-1"></i>Nouvelle réservation
          </button>
        </div>
      </div>

      <div className="planning-legend mb-3 d-flex flex-wrap gap-2">
        <span className="legend-badge" style={{ ['--c' as any]: '#6366f1' } as any}>Option/Provisoire</span>
        <span className="legend-badge" style={{ ['--c' as any]: '#10b981' } as any}>Confirmée</span>
        <span className="legend-badge" style={{ ['--c' as any]: '#f59e0b' } as any}>Garantie Agence</span>
        <span className="legend-badge" style={{ ['--c' as any]: '#06b6d4' } as any}>In-House</span>
        <span className="legend-badge" style={{ ['--c' as any]: '#ef4444' } as any}>No-Show</span>
        <span className="legend-badge" style={{ ['--c' as any]: '#6b7280' } as any}>Annulée</span>
      </div>

      <div className="planning-wrapper glass-card p-3">
        <div className="planning-grid" id="planningGrid" style={{ display: 'grid', gridTemplateColumns: `120px repeat(7, 1fr)` }}>
          {gridChildren}
        </div>
      </div>
    </div>
  );
}