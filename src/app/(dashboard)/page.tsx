'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Wrench, Link as LinkIcon, Building2 } from 'lucide-react';

interface Metrics {
  callsToday: number;
  openMaintenance: number;
  bookingLinks: number;
  activeProperties: number;
}

interface RecentCall {
  id: string;
  caller_phone: string | null;
  property_id: string | null;
  started_at: string;
  duration_seconds: number | null;
  status: string | null;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics>({
    callsToday: 0,
    openMaintenance: 0,
    bookingLinks: 0,
    activeProperties: 0,
  });
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const [callsRes, maintenanceRes, bookingRes, propertiesRes, recentRes] =
        await Promise.all([
          supabase
            .from('call_logs')
            .select('id', { count: 'exact', head: true })
            .gte('started_at', todayISO),
          supabase
            .from('maintenance_tickets')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'open'),
          supabase
            .from('booking_links')
            .select('id', { count: 'exact', head: true }),
          supabase
            .from('properties')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true),
          supabase
            .from('call_logs')
            .select('id, caller_phone, property_id, started_at, duration_seconds, status')
            .order('started_at', { ascending: false })
            .limit(10),
        ]);

      setMetrics({
        callsToday: callsRes.count ?? 0,
        openMaintenance: maintenanceRes.count ?? 0,
        bookingLinks: bookingRes.count ?? 0,
        activeProperties: propertiesRes.count ?? 0,
      });

      setRecentCalls(recentRes.data ?? []);
      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls Today</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.callsToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.openMaintenance}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booking Links</CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.bookingLinks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Properties</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeProperties}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold">Recent Calls</h2>
        {recentCalls.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No recent calls.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Caller</th>
                  <th className="px-4 py-2 text-left font-medium">Started</th>
                  <th className="px-4 py-2 text-left font-medium">Duration</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentCalls.map((call) => (
                  <tr key={call.id} className="border-b last:border-0">
                    <td className="px-4 py-2">{call.caller_phone || 'Unknown'}</td>
                    <td className="px-4 py-2">
                      {new Date(call.started_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      {call.duration_seconds != null
                        ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`
                        : '-'}
                    </td>
                    <td className="px-4 py-2">{call.status || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
