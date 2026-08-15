import { apiFetch } from '@/lib/api-client';

export interface DashboardMetrics {
  callsToday: number;
  durationTodaySeconds: number;
  costTodayUsd: number;
  openTickets: number;
  criticalTickets: number;
  highTickets: number;
  bookingLinks7d: number;
  bookingCtr: string;
  bookingConv: string;
  activeProperties: number;
  recentCalls: unknown[];
  topTickets: unknown[];
}

export function fetchMetrics(): Promise<DashboardMetrics> {
  return apiFetch<DashboardMetrics>('/metrics');
}
