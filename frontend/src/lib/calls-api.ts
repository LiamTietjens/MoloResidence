import { apiFetch } from '@/lib/api-client';

export interface CallLog {
  id: string;
  [key: string]: unknown;
}

export interface CallTicket {
  id: string;
  room_number?: string | null;
  status?: string;
  urgency?: string;
}

export interface CallBooking {
  id: string;
  guest_name?: string | null;
  converted?: boolean;
}

export interface CallDetail {
  call: CallLog;
  propertyName: string | null;
  costRates: Record<string, unknown> | null;
  tickets: CallTicket[];
  bookings: CallBooking[];
}

export function fetchCalls(): Promise<CallLog[]> {
  return apiFetch<CallLog[]>('/calls');
}

export function fetchCall(id: string): Promise<CallDetail> {
  return apiFetch<CallDetail>(`/calls/${id}`);
}
