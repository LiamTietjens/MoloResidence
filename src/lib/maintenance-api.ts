import { apiFetch } from '@/lib/api-client';

export interface MaintenanceTicket {
  id: string;
  [key: string]: unknown;
}

export function fetchMaintenance(): Promise<MaintenanceTicket[]> {
  return apiFetch<MaintenanceTicket[]>('/maintenance');
}

export function fetchMaintenanceTicket(id: string): Promise<MaintenanceTicket> {
  return apiFetch<MaintenanceTicket>(`/maintenance/${id}`);
}

export function updateMaintenanceTicket(
  id: string,
  patch: Record<string, unknown>,
): Promise<{ ok: boolean }> {
  return apiFetch(`/maintenance/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}
