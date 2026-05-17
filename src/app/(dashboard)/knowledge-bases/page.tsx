'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
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
import { PlusIcon, Search, BookOpen } from 'lucide-react';

interface KnowledgeBase {
  id: string;
  name: string;
  content: string | null;
  updated_at: string | null;
  knowledge_base_rooms: { room_number: string }[];
}

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
        .select('id, name, content, updated_at, knowledge_base_rooms(room_number)')
        .order('updated_at', { ascending: false });

      setKnowledgeBases((kbs as KnowledgeBase[]) || []);
      setLoading(false);
    }

    fetchData();
  }, []);

  const filtered = knowledgeBases.filter((kb) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return kb.name.toLowerCase().includes(q);
  });

  function getContentPreview(content: string | null): string {
    if (!content) return 'No content';
    const trimmed = content.trim();
    if (trimmed.length <= 80) return trimmed;
    return trimmed.slice(0, 80) + '...';
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
                <TableHead>Assigned Rooms</TableHead>
                <TableHead>Content</TableHead>
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
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">{kb.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(kb.knowledge_base_rooms || []).length === 0
                        ? 'None'
                        : `${(kb.knowledge_base_rooms || []).length} room${(kb.knowledge_base_rooms || []).length === 1 ? '' : 's'}`}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-md truncate">
                      {getContentPreview(kb.content)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={3}
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
