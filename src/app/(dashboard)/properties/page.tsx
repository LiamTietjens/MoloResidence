'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';

interface PropertyWithRoomCount {
  id: string;
  name: string;
  address: string;
  room_count: number;
}

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyWithRoomCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProperties() {
      // Fetch properties
      const { data: propertiesData, error: propError } = await supabase
        .from('properties')
        .select('id, name, address')
        .order('name', { ascending: true });

      if (propError) {
        setError(propError.message);
        setLoading(false);
        return;
      }

      // Fetch room counts per property through knowledge_bases
      const { data: roomData, error: roomError } = await supabase
        .from('knowledge_base_rooms')
        .select('knowledge_base_id, room_number, knowledge_bases!inner(property_id)')
        .not('knowledge_bases.property_id', 'is', null);

      if (roomError) {
        // If room query fails, still show properties with 0 counts
        setProperties(
          (propertiesData ?? []).map((p) => ({ ...p, room_count: 0 }))
        );
        setLoading(false);
        return;
      }

      // Count rooms per property
      const countMap: Record<string, number> = {};
      for (const row of roomData ?? []) {
        const kb = row.knowledge_bases as unknown as { property_id: string };
        if (kb?.property_id) {
          countMap[kb.property_id] = (countMap[kb.property_id] || 0) + 1;
        }
      }

      setProperties(
        (propertiesData ?? []).map((p) => ({
          ...p,
          room_count: countMap[p.id] || 0,
        }))
      );
      setLoading(false);
    }

    fetchProperties();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
        </div>
        <p className="text-destructive">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
        <Button render={<Link href="/properties/new" />}>
          <PlusIcon data-icon="inline-start" />
          New Property
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Rooms</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.length > 0 ? (
              properties.map((property) => (
                <TableRow
                  key={property.id}
                  className="cursor-pointer"
                  onClick={() =>
                    router.push(`/properties/detail?id=${property.id}`)
                  }
                >
                  <TableCell className="font-medium">
                    {property.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {property.address}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {property.room_count}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-12 text-center text-muted-foreground"
                >
                  No properties yet. Create your first property to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
