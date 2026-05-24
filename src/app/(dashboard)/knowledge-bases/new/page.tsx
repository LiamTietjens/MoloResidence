'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type Property = { id: string; name: string };

export default function NewKnowledgeBasePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [kind, setKind] = useState<'general' | 'property' | 'exception'>('property');
  const [propertyId, setPropertyId] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase
      .from('properties')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data) setProperties(data);
      });
  }, []);

  async function handleCreate() {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (kind !== 'general' && !propertyId) {
      toast.error('Please select a property');
      return;
    }

    setCreating(true);

    const { data: kb, error } = await supabase
      .from('knowledge_bases')
      .insert({
        name: name.trim(),
        kind,
        property_id: kind === 'general' ? null : propertyId,
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
          <Label htmlFor="kind">Kind</Label>
          <select
            id="kind"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as 'general' | 'property' | 'exception');
              if (e.target.value === 'general') setPropertyId('');
            }}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="general">General (no property)</option>
            <option value="property">Property</option>
            <option value="exception">Exception (room override)</option>
          </select>
          <p className="text-xs text-muted-foreground">
            {kind === 'general' && 'Preloaded at call start, not tied to a property.'}
            {kind === 'property' && 'Swapped in after reservation lookup for a specific property.'}
            {kind === 'exception' && 'Overrides the property KB for specific room numbers.'}
          </p>
        </div>

        {kind !== 'general' && (
          <div className="space-y-2">
            <Label htmlFor="property">Property</Label>
            <select
              id="property"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select a property...</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

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
