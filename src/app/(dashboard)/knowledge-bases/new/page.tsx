'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewKnowledgeBasePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    setCreating(true);

    const { data: kb, error } = await supabase
      .from('knowledge_bases')
      .insert({
        name: name.trim(),
        kind: 'property',
        content: content || '',
      })
      .select('id')
      .single();

    if (error) {
      toast.error(error.message);
      setCreating(false);
      return;
    }

    toast.success('Knowledge base created');
    router.push(`/knowledge-bases/detail?id=${kb.id}`);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href="/knowledge-bases" />}>
          <ArrowLeft />
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">New Knowledge Base</h1>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="e.g. Check-in Instructions, Pool Rules..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter the knowledge base content the AI agent will use..."
            className="font-mono min-h-[300px] text-sm leading-relaxed"
          />
          <p className="text-xs text-muted-foreground">
            {content.length.toLocaleString()} characters. You can assign rooms after creation.
          </p>
        </div>

        <Button onClick={handleCreate} disabled={creating}>
          {creating ? 'Creating...' : 'Create Knowledge Base'}
        </Button>
      </div>
    </div>
  );
}
