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
import { PlusIcon, Search } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const { data: kbs } = await supabase
        .from('knowledge_bases')
        .select('*, properties(name), knowledge_base_rooms(room_number)')
        .order('updated_at', { ascending: false });

      setKnowledgeBases((kbs as KnowledgeBase[]) || []);
      setLoading(false);
    }

    fetchData();
  }, []);

  const filtered = knowledgeBases.filter((kb) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      kb.name.toLowerCase().includes(q) ||
      kb.kind.toLowerCase().includes(q) ||
      (kb.properties?.name || '').toLowerCase().includes(q)
    );
  });

  function getRoomSummary(kb: KnowledgeBase): string {
    const rooms = kb.knowledge_base_rooms || [];
    if (rooms.length === 0) return '--';
    if (rooms.length <= 3) {
      return rooms.map((r) => r.room_number).join(', ');
    }
    return `${rooms.slice(0, 3).map((r) => r.room_number).join(', ')} +${rooms.length - 3} more`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge Bases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage content that the AI agent uses during calls.
          </p>
        </div>
        <Button render={<Link href="/knowledge-bases/new" />}>
          <PlusIcon data-icon="inline-start" />
          New Knowledge Base
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search knowledge bases..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Rooms</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? (
                filtered.map((kb) => (
                  <TableRow
                    key={kb.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/knowledge-bases/detail?id=${kb.id}`)}
                  >
                    <TableCell>
                      <span className="font-medium">{kb.name}</span>
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
                      {kb.properties?.name || 'General'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {getRoomSummary(kb)}
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
                        : '--'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-12"
                  >
                    {search
                      ? 'No knowledge bases match your search.'
                      : 'No knowledge bases yet. Create one to get started.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
