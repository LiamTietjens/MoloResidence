import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as client from './api-client';
import {
  fetchKnowledgeBases,
  fetchGeneralKb,
  fetchKbDetail,
  createKnowledgeBase,
  updateKb,
  setKbGeneral,
  saveKbRooms,
  removeKbRoom,
  deleteKb,
} from './knowledge-bases-api';

beforeEach(() => vi.restoreAllMocks());

describe('knowledge-bases-api', () => {
  it('fetchKnowledgeBases GETs /knowledge-bases', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue([{ id: 'kb1' }] as never);
    const res = await fetchKnowledgeBases();
    expect(spy).toHaveBeenCalledWith('/knowledge-bases');
    expect(res[0].id).toBe('kb1');
  });

  it('fetchGeneralKb GETs /knowledge-bases/general', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue({ id: 'kb-gen' } as never);
    const res = await fetchGeneralKb();
    expect(spy).toHaveBeenCalledWith('/knowledge-bases/general');
    expect(res?.id).toBe('kb-gen');
  });

  it('fetchKbDetail GETs /knowledge-bases/:id', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue({ kb: { id: 'kb1' }, properties: [], propRooms: [], allKbRooms: [] } as never);
    await fetchKbDetail('kb1');
    expect(spy).toHaveBeenCalledWith('/knowledge-bases/kb1');
  });

  it('createKnowledgeBase POSTs to /knowledge-bases with name', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue({ ok: true, id: 'new-id' } as never);
    await createKnowledgeBase('My KB');
    expect(spy.mock.calls[0][0]).toBe('/knowledge-bases');
    expect((spy.mock.calls[0][1] as RequestInit).method).toBe('POST');
    expect((spy.mock.calls[0][1] as RequestInit).body).toBe(JSON.stringify({ name: 'My KB', general: undefined }));
  });

  it('createKnowledgeBase POSTs with general flag when provided', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue({ ok: true, id: 'new-id' } as never);
    await createKnowledgeBase('General KB', { general: true });
    expect((spy.mock.calls[0][1] as RequestInit).body).toBe(JSON.stringify({ name: 'General KB', general: true }));
  });

  it('updateKb PATCHes /knowledge-bases/:id with patch body', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue({ ok: true } as never);
    await updateKb('kb1', { name: 'New Name', content: 'new content' });
    expect(spy.mock.calls[0][0]).toBe('/knowledge-bases/kb1');
    expect((spy.mock.calls[0][1] as RequestInit).method).toBe('PATCH');
    expect((spy.mock.calls[0][1] as RequestInit).body).toBe(JSON.stringify({ name: 'New Name', content: 'new content' }));
  });

  it('setKbGeneral POSTs /knowledge-bases/:id/general with {value}', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue({ ok: true } as never);
    await setKbGeneral('kb1', true);
    expect(spy.mock.calls[0][0]).toBe('/knowledge-bases/kb1/general');
    expect((spy.mock.calls[0][1] as RequestInit).method).toBe('POST');
    expect((spy.mock.calls[0][1] as RequestInit).body).toBe(JSON.stringify({ value: true }));
  });

  it('saveKbRooms PUTs /knowledge-bases/:id/rooms with {roomNumbers}', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue({ ok: true } as never);
    await saveKbRooms('kb1', ['101', '102']);
    expect(spy.mock.calls[0][0]).toBe('/knowledge-bases/kb1/rooms');
    expect((spy.mock.calls[0][1] as RequestInit).method).toBe('PUT');
    expect((spy.mock.calls[0][1] as RequestInit).body).toBe(JSON.stringify({ roomNumbers: ['101', '102'] }));
  });

  it('removeKbRoom DELETEs /knowledge-bases/:id/rooms with body', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue({ ok: true } as never);
    await removeKbRoom('kb1', '101');
    expect(spy.mock.calls[0][0]).toBe('/knowledge-bases/kb1/rooms');
    expect((spy.mock.calls[0][1] as RequestInit).method).toBe('DELETE');
    expect((spy.mock.calls[0][1] as RequestInit).body).toBe(JSON.stringify({ roomNumber: '101', otherKbId: undefined }));
  });

  it('removeKbRoom passes otherKbId when provided', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue({ ok: true } as never);
    await removeKbRoom('kb1', '101', 'kb2');
    expect((spy.mock.calls[0][1] as RequestInit).body).toBe(JSON.stringify({ roomNumber: '101', otherKbId: 'kb2' }));
  });

  it('deleteKb DELETEs /knowledge-bases/:id', async () => {
    const spy = vi.spyOn(client, 'apiFetch').mockResolvedValue({ ok: true } as never);
    await deleteKb('kb1');
    expect(spy.mock.calls[0][0]).toBe('/knowledge-bases/kb1');
    expect((spy.mock.calls[0][1] as RequestInit).method).toBe('DELETE');
  });
});
