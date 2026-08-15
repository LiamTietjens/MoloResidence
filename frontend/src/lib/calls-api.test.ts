import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as client from './api-client';
import { fetchCalls, fetchCall, deleteCallTranscript } from './calls-api';

beforeEach(() => vi.restoreAllMocks());

describe('calls-api', () => {
  it('fetchCalls GETs /calls', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue([{ id: 'c1' }] as never);
    const res = await fetchCalls();
    expect(spy).toHaveBeenCalledWith('/calls');
    expect(res[0].id).toBe('c1');
  });

  it('fetchCall GETs /calls/:id', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue({
      call: { id: 'c1' },
      propertyName: 'Hotel A',
      costRates: null,
      tickets: [],
      bookings: [],
    } as never);
    const res = await fetchCall('c1');
    expect(spy).toHaveBeenCalledWith('/calls/c1');
    expect(res.call.id).toBe('c1');
    expect(res.propertyName).toBe('Hotel A');
  });

  it('fetchCall returns composed detail shape', async () => {
    vi.spyOn(client, 'apiFetch').mockResolvedValue({
      call: { id: 'c2' },
      propertyName: null,
      costRates: { per_min: 0.01 },
      tickets: [{ id: 't1' }],
      bookings: [{ id: 'b1', converted: false }],
    } as never);
    const res = await fetchCall('c2');
    expect(res.tickets).toHaveLength(1);
    expect(res.bookings).toHaveLength(1);
  });

  it('deleteCallTranscript DELETEs /calls/:id/transcript', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue({ ok: true } as never);
    const res = await deleteCallTranscript('c1');
    // The path must target the transcript sub-resource, NOT /calls/c1 — that
    // would read as deleting the whole call record.
    expect(spy).toHaveBeenCalledWith('/calls/c1/transcript', { method: 'DELETE' });
    expect(res.ok).toBe(true);
  });
});
