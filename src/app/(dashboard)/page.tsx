'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, BookOpen, DoorOpen } from 'lucide-react';

interface Metrics {
  properties: number;
  knowledgeBases: number;
  totalRooms: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics>({
    properties: 0,
    knowledgeBases: 0,
    totalRooms: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      const [propertiesRes, kbRes, roomsRes] = await Promise.all([
        supabase
          .from('properties')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('knowledge_bases')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('knowledge_base_rooms')
          .select('id', { count: 'exact', head: true }),
      ]);

      setMetrics({
        properties: propertiesRes.count ?? 0,
        knowledgeBases: kbRes.count ?? 0,
        totalRooms: roomsRes.count ?? 0,
      });
      setLoading(false);
    }

    fetchMetrics();
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
      <p className="mt-1 text-muted-foreground">
        Overview of your Molo Residence configuration.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Properties
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics.properties}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Knowledge Bases
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {metrics.knowledgeBases}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Room Assignments
            </CardTitle>
            <DoorOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{metrics.totalRooms}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
