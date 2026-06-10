import Link from 'next/link';
import { createServerClient } from '@/backend/supabase';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { KbListClient, type KbListItem } from './kb-list-client';

export const dynamic = 'force-dynamic';

export default async function KnowledgeBasesPage() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('knowledge_bases')
    .select('id, name, content, updated_at, knowledge_base_rooms(room_number)')
    .order('updated_at', { ascending: false });

  const knowledgeBases = (data ?? []) as KbListItem[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge Bases</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage content that the AI agent uses during calls.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/knowledge-bases/new" />}>
          <PlusIcon data-icon="inline-start" />
          New Knowledge Base
        </Button>
      </div>

      <KbListClient knowledgeBases={knowledgeBases} />
    </div>
  );
}
