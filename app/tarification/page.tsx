'use client';

// ═══════════════════════════════════════════════════════════
// OASIS PMS — Tarification (Module 4)
// Reproduction exacte : fo-tabs/fo-tab, pms-table, extras-cat-card,
// extras-cat-icon, extras-item, fiscal-card, alert-info-box
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTarifs, getExtras, getFiscalite } from '@/lib/api/tarification';

type TabKey = 'grille' | 'extras' | 'fiscalite';

export default function TarificationPage() {
  const [tab, setTab] = useState<TabKey>('grille');

  const { data: tarifs } = useQuery({ queryKey: ['tarifs'],     queryFn: getTarifs });
  const { data: extras } = useQuery({ queryKey: ['extras'],     queryFn: getExtras });
  const { data: fiscalite } = useQuery({ queryKey: ['fiscalite'], queryFn: getFiscalite });

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'grille',    label: 'Grille tarifaire', icon: 'bi-table' },
    { key: 'extras',    label: 'Extras & POS',      icon: 'bi-bag-plus' },
    { key: 'fiscalite', label: 'Fiscalité',          icon: 'bi-percent' },
  ];

  return (
    <div>
      {/* ── Section Header ── */}
      <div className="section-header">
        <h2 className="section-title">Tarifs, Fiscalité &amp; Extras</h2>
      </div>

      {/* ── Tabs (style fo-tabs comme Front Office) ── */}
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

      {/* ── Grille Tarifaire ── */}
      {tab === 'grille' && (
        <div className="glass-card p-4">
          <h6 className="fw-600 mb-3">Matrice Tarifaire — Catégories × Saisons</h6>
          <div className="table-responsive">
            <table className="table pms-table">
              <thead>
                <tr>
                  <th>Catégorie</th>
                  <th className="text-center">Basse Saison<br /><small>Oct–Mars</small></th>
                  <th className="text-center">Moyenne Saison<br /><small>Avr–Juin</small></th>
                  <th className="text-center">Haute Saison<br /><small>Juil–Sep</small></th>
                  <th className="text-center">Pics<br /><small>Noël, Nouvel An</small></th>
                </tr>
              </thead>
              <tbody>
                {tarifs?.map((t) => (
                  <tr key={t.cat}>
                    <td style={{ fontWeight: 600 }}>{t.cat}</td>
                    <td className="text-center">{t.basse.toLocaleString()} DH</td>
                    <td className="text-center">{t.moyenne.toLocaleString()} DH</td>
                    <td className="text-center" style={{ color: 'var(--accent)', fontWeight: 600 }}>{t.haute.toLocaleString()} DH</td>
                    <td className="text-center" style={{ color: 'var(--rose)', fontWeight: 700 }}>{t.pics.toLocaleString()} DH</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="alert-info-box mt-3">
            <i className="bi bi-info-circle me-2" />
            Tarifs TTC, incluant hébergement + petit-déjeuner (BB) + TVA hôtelière (10%). DP +220 DH / PC +420 DH par nuit.
          </div>
        </div>
      )}

      {/* ── Extras & POS ── */}
      {tab === 'extras' && (
        <div className="row g-3">
          {extras?.map((cat) => (
            <div key={cat.cat} className="col-md-6 col-lg-4">
              <div className="extras-cat-card">
                <div className="extras-cat-header">
                  <div className="extras-cat-icon" style={{ background: cat.color }}>
                    <i className={`bi bi-${cat.icon}`} />
                  </div>
                  <div className="extras-cat-title">{cat.cat}</div>
                </div>
                <div>
                  {cat.items.map((item) => (
                    <div key={item.name} className="extras-item">
                      <span>{item.name}</span>
                      <span className="extras-price">{item.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Fiscalité ── */}
      {tab === 'fiscalite' && (
        <div className="glass-card p-4">
          <h6 className="fw-600 mb-3">Fiscalité Locale (TS &amp; TPT) — Maroc</h6>
          <div className="row g-3">
            {fiscalite?.map((f) => (
              <div key={f.label} className="col-md-6">
                <div className="fiscal-card">
                  <div className="fiscal-icon">
                    <i className="bi bi-receipt" />
                  </div>
                  <div>
                    <div className="fiscal-label">{f.label}</div>
                    <div className="fiscal-rate">{f.amount}</div>
                    <div className="fiscal-note">{f.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
