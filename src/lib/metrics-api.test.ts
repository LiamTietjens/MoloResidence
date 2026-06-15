import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as client from './api-client';
import { fetchMetrics } from './metrics-api';

beforeEach(() => vi.restoreAllMocks());

describe('metrics-api', () => {
  it('fetchMetrics GETs /metrics', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue({
      callsToday: 5,
      openTickets: 2,
    } as never);
    const res = await fetchMetrics();
    expect(spy).toHaveBeenCalledWith('/metrics');
    expect(res.callsToday).toBe(5);
  });

  it('fetchMetrics returns the full metrics shape', async () => {
    const mockData = {
      callsToday: 3,
      durationTodaySeconds: 300,
      costTodayUsd: 0.15,
      openTickets: 1,
      criticalTickets: 0,
      highTickets: 1,
      bookingLinks7d: 10,
      bookingCtr: '50%',
      bookingConv: '25%',
      activeProperties: 8,
      recentCalls: [],
      topTickets: [],
    };
    vi.spyOn(client, 'apiFetch').mockResolvedValue(mockData as never);
    const res = await fetchMetrics();
    expect(res.activeProperties).toBe(8);
    expect(res.bookingCtr).toBe('50%');
  });
});
