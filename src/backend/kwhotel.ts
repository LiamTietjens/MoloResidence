import 'server-only';

/**
 * KWHotel Integrations API client (server-only) — used to import a property's
 * rooms into the Molo database.
 *   Base: {KWHOTEL_API_BASE}/api/integrations/hotels/{HotelId}/...
 *   Auth: header  ApiKey: <KWHOTEL_API_KEY>
 */

const BASE = (
  process.env.KWHOTEL_API_BASE || 'https://cloud.kwhotel.com/kwhotel'
).replace(/\/$/, '');

function kwHeaders(): HeadersInit {
  return { Accept: 'application/json', ApiKey: process.env.KWHOTEL_API_KEY ?? '' };
}

export interface KwRoom {
  roomId: number | null;
  name: string | null;
  roomGroup: string | null;
}

/** GET /property/rooms — the hotel's physical rooms. */
export async function listRooms(hotelId: number): Promise<KwRoom[]> {
  const url = `${BASE}/api/integrations/hotels/${hotelId}/property/rooms?IncludeAdditionalDescriptions=true`;
  const res = await fetch(url, { headers: kwHeaders(), cache: 'no-store' });
  if (!res.ok) {
    throw new Error(
      res.status === 401 || res.status === 403
        ? 'KWHotel rejected the API key (401/403).'
        : `KWHotel returned ${res.status}.`
    );
  }
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((r: Record<string, unknown>) => ({
    roomId: typeof r.id === 'number' ? r.id : null,
    name: typeof r.name === 'string' ? r.name : null,
    roomGroup:
      typeof (r.roomGroup as Record<string, unknown>)?.name === 'string'
        ? ((r.roomGroup as Record<string, unknown>).name as string)
        : null,
  }));
}
