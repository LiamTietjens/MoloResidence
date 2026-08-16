import { apiFetch } from '@/lib/api-client';

export type RangeKey = 'day' | 'week' | 'month' | 'year';

export interface SeriesPoint {
  date: string;
  count: number;
}

export interface CategoryCount {
  outcome: string;
  count: number;
}

export interface DashboardMetrics {
  range: RangeKey;
  /** How the series is bucketed — drives x-axis label formatting. */
  bucket: 'hour' | 'day' | 'month';
  totalCalls: number;
  totalMinutes: number;
  totalCostUsd: number;
  /** Human minutes the AI handled instead. */
  minutesSaved: number;
  moneySavedEur: number;
  openTickets: number;
  criticalTickets: number;
  highTickets: number;
  series: SeriesPoint[];
  categories: CategoryCount[];
  topTickets: unknown[];
  calls: unknown[];
}

export function fetchMetrics(range: RangeKey = 'week'): Promise<DashboardMetrics> {
  return apiFetch<DashboardMetrics>(`/metrics?range=${range}`);
}
