import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch, setToken, clearToken } from './api-client';

beforeEach(() => {
  clearToken();
  localStorage.clear();
  vi.restoreAllMocks();
  process.env.NEXT_PUBLIC_API_URL = 'https://api.example.test/api';
});

describe('apiFetch', () => {
  it('attaches the bearer token when set', async () => {
    setToken('tok123');
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    await apiFetch('/properties');
    const headers = (spy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok123');
  });

  it('throws with the server error message on non-2xx', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'boom' }), { status: 400 })
    );
    await expect(apiFetch('/properties')).rejects.toThrow('boom');
  });

  it('clears the token and throws on 401', async () => {
    setToken('tok123');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    );
    await expect(apiFetch('/properties')).rejects.toThrow();
    expect(localStorage.getItem('molo_token')).toBeNull();
  });
});
