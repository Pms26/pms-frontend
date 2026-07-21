// ═══════════════════════════════════════════════════════════
// OASIS PMS — Shared TypeScript Types
// ═══════════════════════════════════════════════════════════

// ─── Auth ────────────────────────────────────────────────

// ─── Auth ────────────────────────────────────────────────────

export type UserRole =
  | 'admin'
  | 'manager'
  | 'receptionist'
  | 'housekeeping_supervisor';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ─── Rooms ───────────────────────────────────────────────

export type RoomStatus = 'sale' | 'encours' | 'propre' | 'controlee' | 'bloquee' | 'inhouse';

export type RoomCategory = 'standard' | 'superior' | 'suite' | 'suite_deluxe' | 'lodge' | 'villa';

export interface Room {
  id: string;
  type: string;
  category: RoomCategory;
  floor: number;
  status: RoomStatus;
  reason?: string; // motif de blocage
}

export const ROOM_STATUS_CONFIG: Record<RoomStatus, { label: string; color: string; icon: string }> = {
  sale:      { label: 'Sale',       color: '#ef4444', icon: 'exclamation-circle' },
  encours:   { label: 'En cours',   color: '#f59e0b', icon: 'arrow-repeat' },
  propre:    { label: 'Propre',     color: '#10b981', icon: 'check-circle' },
  controlee: { label: 'Contrôlée', color: '#6366f1', icon: 'shield-check' },
  bloquee:   { label: 'Bloquée',   color: '#6b7280', icon: 'x-octagon' },
  inhouse:   { label: 'In-House',   color: '#06b6d4', icon: 'person' },
};

// ─── Reservations ────────────────────────────────────────

export type ReservationStatus =
  | 'option'
  | 'confirmed'
  | 'voucher'
  | 'inhouse'
  | 'checkout'
  | 'noshow'
  | 'cancelled';

export type MarketSegment = 'direct' | 'ota' | 'b2b';

export type MealPlan = 'BB' | 'DP' | 'PC';

export interface Reservation {
  id: string;
  client: string;
  room: string;
  arrival: string;   // ISO date
  departure: string; // ISO date
  regime: MealPlan;
  segment: MarketSegment;
  status: ReservationStatus;
  total: string;
  pax?: number;
  notes?: string;
}

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  option: 'Option',
  confirmed: 'Confirmée',
  voucher: 'Garantie Agence',
  inhouse: 'In-House',
  checkout: 'Check-out',
  noshow: 'No-Show',
  cancelled: 'Annulée',
};

export const STATUS_COLORS: Record<ReservationStatus, string> = {
  option: '#6366f1',
  confirmed: '#10b981',
  voucher: '#f59e0b',
  inhouse: '#06b6d4',
  checkout: '#8b5cf6',
  noshow: '#ef4444',
  cancelled: '#6b7280',
};

export const SEGMENT_LABELS: Record<MarketSegment, string> = {
  direct: 'Direct',
  ota: 'OTA',
  b2b: 'B2B / Agence',
};

export const SEGMENT_COLORS: Record<MarketSegment, string> = {
  direct: '#6366f1',
  ota: '#10b981',
  b2b: '#f59e0b',
};

// ─── Tarification ────────────────────────────────────────

export interface TarifCategory {
  cat: string;
  basse: number;
  moyenne: number;
  haute: number;
  pics: number;
}

export interface ExtraItem {
  name: string;
  price: string;
}

export interface ExtraCategory {
  cat: string;
  color: string;
  icon: string;
  items: ExtraItem[];
}

export interface FiscaliteItem {
  label: string;
  description: string;
  amount: string;
}

// ─── Night Audit ─────────────────────────────────────────

export interface NightAuditStatus {
  businessDate: string;
  isOpen: boolean;
  lastClosedDate: string | null;
  checks: NightAuditCheck[];
}

export interface NightAuditCheck {
  id: string;
  label: string;
  description: string;
  status: 'ok' | 'warning' | 'error';
  icon: string;
  color: string;
}

export interface NightAuditReport {
  icon: string;
  label: string;
  color: string;
}

export interface Closure {
  id: string;
  businessDate: string;
  closedAt: string;
  closedBy: string;
  justification?: string;
  revenue: number;
  occupancyRate: number;
}

// ─── Analytics / KPIs ────────────────────────────────────

export interface KPI {
  label: string;
  value: string;
  unit: string;
  delta: string;
  deltaType: 'positive' | 'negative' | 'neutral';
  icon: string;
  gradient: string;
  gradientCss?: string; // inline CSS gradient string (ex: 'linear-gradient(135deg,#6366f1,#8b5cf6)')
}

export interface SegmentAnalytics {
  segment: string;
  nuitees2026: number;
  nuitees2025: number;
  deltaNuitees: string;
  ca2026: string;
  ca2025: string;
  deltaCa: string;
  adr2026: string;
  adr2025: string;
  deltaAdr: string;
}

export interface YTDCard {
  label: string;
  value: string;
  barWidth: string;
  detail: string;
}

// ─── Front Office ────────────────────────────────────────

export interface FolioEntry {
  prestation: string;
  date: string;
  qty: number;
  amount: string;
}

export interface CheckOutSummary {
  hebergement: string;
  extras: string;
  taxeSejour: string;
  total: string;
}

export type PaymentMode = 'cb' | 'esp' | 'chq' | 'vir' | 'deb';

// ─── Client ──────────────────────────────────────────────

export interface Client {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  tel: string;
  notes?: string;
}
