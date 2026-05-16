import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
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

export default async function PropertiesPage() {
  const { data: properties, error } = await supabase
    .from('properties')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
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
            {properties && properties.length > 0 ? (
              properties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell>
                    <Link
                      href={`/properties/${property.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {property.name}
                    </Link>
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
                      : '—'}
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
