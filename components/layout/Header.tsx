'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Topbar Header (Reproduction Exacte du Style)
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';

interface HeaderProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      // Format: long weekday, 2-digit day, long month, numeric year
      const formatted = now.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      // Capitalize first letter
      setDateStr(formatted.charAt(0).toUpperCase() + formatted.slice(1));
    };

    updateDate();
  }, []);

  return (
    <header className="topbar">
      <div className="d-flex align-items-center gap-3">
        <button className="sidebar-toggle" onClick={onToggleSidebar}>
          <i className="bi bi-list" />
        </button>
        <div className="topbar-date">
          <i className="bi bi-calendar-check me-2 text-accent" />
          <span>{dateStr}</span>
        </div>
      </div>
      <div className="d-flex align-items-center gap-3">
        <div className="topbar-search">
          <i className="bi bi-search" />
          <input type="text" placeholder="Rechercher client, chambre..." />
        </div>
        <button className="btn-icon-top" title="Notifications">
          <i className="bi bi-bell" />
          <span className="notif-dot" />
        </button>
        <button className="btn-icon-top" title="Paramètres">
          <i className="bi bi-gear" />
        </button>
      </div>
    </header>
  );
}
