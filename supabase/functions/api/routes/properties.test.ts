import { assertEquals } from 'jsr:@std/assert@^1.0.0';
import { Hono } from 'hono';
import { buildPropertyRoutes } from './properties.ts';

// Minimal chainable fake of the supabase-js query builder for the calls we make.
function fakeClient(tables: Record<string, unknown[]>) {
  return {
    from(table: string) {
      const rows = tables[table] ?? [];
      const builder: Record<string, unknown> = {
        _rows: rows,
        // supabase-js query builders are thenable: `await sb.from(t).select(...)`
        // resolves to `{ data, error }`. Model that so chains that end on
        // `.select()` (e.g. the property_rooms query) resolve correctly.
        then(onFulfilled: (value: { data: unknown[]; error: null }) => unknown) {
          return Promise.resolve({ data: rows, error: null }).then(onFulfilled);
        },
        select() { return builder; },
        order() { return Promise.resolve({ data: rows, error: null }); },
        eq() { return builder; },
        insert(payload: unknown) {
          return {
            select() {
              return { single() { return Promise.resolve({ data: { id: 'new-id' }, error: null }); } };
            },
          };
        },
        update() { return { eq() { return Promise.resolve({ error: null }); } }; },
        delete() { return { eq() { return Promise.resolve({ error: null }); } }; },
      };
      return builder;
    },
  };
}

function app(client: unknown) {
  const a = new Hono();
  a.route('/properties', buildPropertyRoutes(() => client as never));
  return a;
}

Deno.test('GET /properties returns properties with a rooms array', async () => {
  const client = fakeClient({
    properties: [{ id: 'p1', name: 'Old Town', address: 'A', kwhotel_hotel_id: null, transfer_phone: null, aliases: [], language_default: 'pl', timezone: 'Europe/Warsaw', notes: null }],
    property_rooms: [{ property_id: 'p1', room_number: '101' }],
  });
  const res = await app(client).request('/properties');
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body[0].id, 'p1');
  assertEquals(body[0].rooms, ['101']);
});

Deno.test('POST /properties returns the new id', async () => {
  const res = await app(fakeClient({})).request('/properties', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'New', address: 'B', kwhotel_hotel_id: null, transfer_phone: null, aliases: [], language_default: 'pl', timezone: 'Europe/Warsaw', notes: null }),
  });
  assertEquals(res.status, 200);
  assertEquals((await res.json()).id, 'new-id');
});

Deno.test('DELETE /properties/:id succeeds', async () => {
  const res = await app(fakeClient({})).request('/properties/p1', { method: 'DELETE' });
  assertEquals(res.status, 200);
  assertEquals((await res.json()).ok, true);
});
