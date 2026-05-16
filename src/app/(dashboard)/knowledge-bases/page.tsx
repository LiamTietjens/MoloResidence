'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusIcon } from 'lucide-react';

interface Property {
  id: string;
  name: string;
}

interface KnowledgeBase {
  id: string;
  name: string;
  kind: 'general' | 'property' | 'exception';
  property_id: string | null;
  content: string | null;
  updated_at: string | null;
  properties: { name: string } | null;
  knowledge_base_rooms: { room_number: string }[];
}

const KIND_COLORS: Record<string, string> = {
  general: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  property: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  exception: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

export default function KnowledgeBasesPage() {
  const router = useRouter();
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const [{ data: props }, { data: kbs }] = await Promise.all([
        supabase.from('properties').select('id, name').order('name'),
        supabase
          .from('knowledge_bases')
          .select('*, properties(name), knowledge_base_rooms(room_number)')
          .order('updated_at', { ascending: false }),
      ]);

      setProperties(props || []);
      setKnowledgeBases((kbs as KnowledgeBase[]) || []);
      setLoading(false);
    }

    fetchData();
  }, []);

  // Client-side filtering
  const filtered = knowledgeBases.filter((kb) => {
    if (search && !kb.name.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (propertyFilter !== 'all' && kb.property_id !== propertyFilter) {
      return false;
    }
    if (kindFilter !== 'all' && kb.kind !== kindFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge Bases</h1>
        <Button render={<Link href="/knowledge-bases/new" />}>
          <PlusIcon data-icon="inline-start" />
          New KB
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={propertyFilter} onValueChange={(v) => setPropertyFilter(v ?? "all")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={kindFilter} onValueChange={(v) => setKindFilter(v ?? "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Kinds" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Kinds</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="property">Property</SelectItem>
            <SelectItem value="exception">Exception</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Rooms</TableHead>
              <TableHead>Content Length</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((kb) => {
                const rooms = kb.knowledge_base_rooms || [];
                const displayRooms = rooms.slice(0, 3);
                const extraCount = rooms.length - 3;

                return (
                  <TableRow
                    key={kb.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/knowledge-bases/detail?id=${kb.id}`)}
                  >
                    <TableCell>
                      <span className="font-medium text-foreground hover:underline">
                        {kb.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={KIND_COLORS[kb.kind] || ''}
                        variant="secondary"
                      >
                        {kb.kind}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {kb.properties?.name || '\u2014'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {displayRooms.map((r) => (
                          <Badge key={r.room_number} variant="outline">
                            {r.room_number}
                          </Badge>
                        ))}
                        {extraCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            +{extraCount} more
                          </span>
                        )}
                        {rooms.length === 0 && (
                          <span className="text-muted-foreground">{'\u2014'}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {kb.content
                        ? `${kb.content.length.toLocaleString()} chars`
                        : '0 chars'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {kb.updated_at
                        ? formatDistanceToNow(new Date(kb.updated_at), {
                            addSuffix: true,
                          })
                        : '\u2014'}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground py-8"
                >
                  No knowledge bases found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
