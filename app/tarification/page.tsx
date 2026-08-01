'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Tarification (Module 4)
// Page unique à 7 onglets : Grille tarifaire, Régimes, Taxes
// locales, Partenaires, Extras & POS, Remises, Packages.
// Chaque onglet est rendu par un composant de components/tarification/.
// Accès middleware : /tarification → admin, manager, comptable.
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import TariffGrid from '@/components/tarification/TariffGrid';
import RegimeMatrix from '@/components/tarification/RegimeMatrix';
import TaxConfig from '@/components/tarification/TaxConfig';
import PartnersTab from '@/components/tarification/PartnersTab';
import ExtrasTab from '@/components/tarification/ExtrasTab';
import DiscountsTab from '@/components/tarification/DiscountsTab';
import PackagesTab from '@/components/tarification/PackagesTab';

type TabKey =
  | 'grille'
  | 'regimes'
  | 'taxes'
  | 'partenaires'
  | 'extras'
  | 'remises'
  | 'packages';

export default function TarificationPage() {
  const [tab, setTab] = useState<TabKey>('grille');

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'grille',     label: 'Grille tarifaire', icon: 'bi-table' },
    { key: 'regimes',    label: 'Régimes',           icon: 'bi-cup-hot' },
    { key: 'taxes',      label: 'Taxes locales',     icon: 'bi-percent' },
    { key: 'partenaires', label: 'Partenaires',      icon: 'bi-building' },
    { key: 'extras',     label: 'Extras & POS',      icon: 'bi-bag-plus' },
    { key: 'remises',    label: 'Remises',           icon: 'bi-tag' },
    { key: 'packages',   label: 'Packages',          icon: 'bi-box-seam' },
  ];

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Tarification</h2>
      </div>

      <ul className="fo-tabs mb-4">
        {tabs.map((t) => (
          <li
            key={t.key}
            className={`fo-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <i className={`bi ${t.icon} me-2`} />{t.label}
          </li>
        ))}
      </ul>

      {tab === 'grille' && <TariffGrid />}
      {tab === 'regimes' && <RegimeMatrix />}
      {tab === 'taxes' && <TaxConfig />}
      {tab === 'partenaires' && <PartnersTab />}
      {tab === 'extras' && <ExtrasTab />}
      {tab === 'remises' && <DiscountsTab />}
      {tab === 'packages' && <PackagesTab />}
    </div>
  );
}
