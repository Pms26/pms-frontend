// ═══════════════════════════════════════════════════════════
// OASIS PMS — Shared TypeScript Types
// ═══════════════════════════════════════════════════════════

// ─── Auth ────────────────────────────────────────────────

// ─── Auth ────────────────────────────────────────────────────

export type UserRole =
  | 'admin'
  | 'manager'
  | 'receptionist'
  | 'housekeeping_supervisor'
  | 'comptable';

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
  status: 'en_cours' | 'echouee';
  isOpen: boolean;
  lastClosure: {
    businessDate: string;
    closedAt: string;
    closedByRole: string;
  } | null;
  errorDetails: {
    service: string;
    code: string;
  } | null;
}

export interface CheckBalanceResponse {
  businessDate: string;
  equilibre: boolean;
  totalDebit: number;
  totalCredit: number;
  ecart: number;
  decomposition: {
    debitSources: Record<string, number>;
    creditSources: Record<string, number>;
  };
}

export interface Closure {
  businessDate: string;
  status: 'cloturee' | 'echouee';
  closedByRole: string;
  closedAt: string;
  totalDebit: number | null;
  totalCredit: number | null;
  ecart: number | null;
  reportsGenerated: number;
  justification?: string;
  warnings?: Array<{
    report: string;
    reason: string;
  }>;
  errorDetails?: {
    code: string;
  };
}

export interface RevenueBreakdown {
  category: 'lodging' | 'fb' | 'extras' | 'tourism_tax';
  amountHt: number;
  tvaRate: number;
  tvaAmount: number;
  amountTtc: number;
}

export interface PaymentSummary {
  paymentMethod: 'cash' | 'card' | 'wire_transfer';
  totalAmount: number;
  transactionCount: number;
}

export interface DebtorSummary {
  debtorName: string;
  debtorReference: string;
  amount: number;
  invoiceCount: number;
}

export interface ClosureDetail {
  closure: Closure;
  revenueBreakdown: RevenueBreakdown[];
  paymentSummary: PaymentSummary[];
  debtorsSummary: DebtorSummary[];
}

export interface NightAuditReport {
  id: string;
  type: string;
  name: string;
  fileSize?: number;
  checksum?: string;
  generatedAt?: string;
  downloadUrl?: string;
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

// ─── Analytics Dashboard (nouveaux types) ──────────────

export interface SegmentGroup {
  code: string;
  label: string;
}

export interface TrendMonth {
  month: number;
  totalRooms: number;
  totalNights: number;
  totalRevenue: number;
  occupancyRate: number;
  adr: number;
  revpar: number;
  avgStayDuration: number;
  activeBookings: number;
}

export interface TrendResponse {
  year: number;
  months: TrendMonth[];
}

export interface SegmentGroupsResponse {
  segments: SegmentGroup[];
  groups: Record<string, string[]>;
}

export interface SegmentPieItem {
  segment: string;
  label: string;
  nights: number;
  percentage: number;
}

export interface SegmentBarItem {
  segment: string;
  label: string;
  revenue: number;
}

export interface SegmentDistribution {
  period: { year: number; month: number };
  totalNights: number;
  pieChart: SegmentPieItem[];
  barChart: SegmentBarItem[];
}

export interface ComparisonMetrics {
  totalRooms: number;
  totalNights: number;
  totalRevenue: number;
  occupancyRate: number;
  adr: number;
  revpar: number;
}

export interface ComparisonDeltas {
  occupancyRate: number | null;
  adr: number | null;
  revpar: number | null;
  revenue: number | null;
}

export interface MonthlyComparison {
  period: { current: { year: number; month: number }; previous: { year: number; month: number } };
  segment: string;
  current: ComparisonMetrics;
  previous: ComparisonMetrics;
  deltas: ComparisonDeltas;
}

export interface YTDComparisonItem {
  month: number;
  current: ComparisonMetrics;
  previous: ComparisonMetrics;
  deltas: ComparisonDeltas;
}

export interface YTDComparisonResponse {
  period: { currentYear: number; prevYear: number; upToMonth: number };
  segment: string;
  comparison: YTDComparisonItem[];
}

export interface SegmentTrendMonthItem {
  segment: string;
  label: string;
  nights: number;
  revenue: number;
  adr: number;
}

export interface SegmentTrendMonth {
  month: number;
  segments: SegmentTrendMonthItem[];
}

export interface SegmentTrendResponse {
  year: number;
  months: SegmentTrendMonth[];
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
