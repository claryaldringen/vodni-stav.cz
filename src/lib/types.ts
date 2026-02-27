export interface Station {
  id: number;
  id_external: string;
  code: string | null;
  name: string;
  river_name: string | null;
  basin_name: string | null;
  lat: number | null;
  lon: number | null;
  elevation_m: number | null;
  is_active: boolean;
  meta: Record<string, unknown> | null;
}

export interface Measurement {
  ts: string;
  water_level_cm: number | null;
  discharge_m3s: number | null;
}

export type Period = '24h' | '3d' | '7d' | '30d';

export interface River {
  id: number;
  name: string;
  basin_name: string | null;
  station_count: number;
  latest_avg_discharge_m3s: number | null;
}

export type Granularity = '10min' | 'hour' | 'day' | 'month' | 'year';
export type RiverPeriod = '24h' | '3d' | '7d' | '30d' | '90d' | '1y' | '5y' | 'all';

export interface ApiSuccessResponse<
  T,
  M extends Record<string, unknown> = Record<string, never>,
> {
  data: T;
  meta?: M;
}

export interface ApiErrorResponse {
  error: { message: string; status: number };
}

export type StationsResponse = ApiSuccessResponse<Station[], { count: number }>;
export type StationResponse = ApiSuccessResponse<Station>;
export type StationMeasurementsResponse = ApiSuccessResponse<
  Measurement[],
  { count: number; period: Period; from?: string; to?: string }
>;
export type RiversResponse = ApiSuccessResponse<River[], { count: number }>;
export type RiverResponse = ApiSuccessResponse<River>;
export type RiverMeasurementsResponse = ApiSuccessResponse<
  Measurement[],
  { count: number; granularity: Granularity; period: RiverPeriod; from?: string; to?: string }
>;

export interface ValueStats {
  min: number;
  max: number;
  avg: number;
  median: number;
  max_change: number | null;
}

export interface MeasurementStats {
  water_level_cm: ValueStats | null;
  discharge_m3s: ValueStats | null;
}

export type PaymentPlan = 'monthly' | 'yearly';
export type PaymentStatus = 'pending' | 'paid' | 'expired';

export interface Payment {
  id: number;
  user_id: string;
  amount: number;
  vs: string;
  plan: PaymentPlan;
  status: PaymentStatus;
  fio_transaction_id: string | null;
  created_at: string;
  paid_at: string | null;
  expires_at: string | null;
}

export interface SubscriptionInfo {
  active: boolean;
  plan: PaymentPlan;
  paidAt: string;
  expiresAt: string;
}

export type ApiKeyMode = 'test' | 'live';

export interface ApiKey {
  id: number;
  name: string;
  key_prefix: string;
  mode: ApiKeyMode;
  last_used_at: string | null;
  request_count: number;
  is_active: boolean;
  created_at: string;
}
