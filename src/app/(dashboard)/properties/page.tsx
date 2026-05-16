'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';

interface Property {
  id: string;
  name: string;
  address: string;
  kwhotel_hotel_id: number | null;
  language_default: string | null;
  updated_at: string | null;
}

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProperties() {
      const { data, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setProperties(data ?? []);
      }
      setLoading(false);
    }

    fetchProperties();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
        </div>
        <Card className="p-8 text-center text-muted-foreground">Loading...</Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
        </div>
        <Card className="p-8 text-center text-destructive">Error: {error}</Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
        <Button render={<Link href="/properties/new" />}>
          <PlusIcon data-icon="inline-start" />
          New property
        </Button>
      </div>

      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>KW Hotel ID</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.length > 0 ? (
              properties.map((property) => (
                <TableRow
                  key={property.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/properties/detail?id=${property.id}`)}
                >
                  <TableCell>
                    <span className="font-medium text-foreground hover:underline">
                      {property.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {property.address}
                  </TableCell>
                  <TableCell>
                    {property.kwhotel_hotel_id != null ? (
                      property.kwhotel_hotel_id
                    ) : (
                      <span className="italic text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {property.language_default?.toUpperCase() ?? 'EN'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {property.updated_at
                      ? formatDistanceToNow(new Date(property.updated_at), {
                          addSuffix: true,
                        })
                      : '\u2014'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No properties found. Create your first property to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
