'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type Property = { id: string; name: string };

export default function NewKnowledgeBasePage() {
  const router = useRouter();
  const [name, setName] = useState('');
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
    if (!propertyId) {
      toast.error('Please select a property');
      return;
    }

    setCreating(true);

    const { data: kb, error } = await supabase
      .from('knowledge_bases')
      .insert({
        name: name.trim(),
        kind: 'property',
        property_id: propertyId,
        content: '',
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
    <div className="space-y-6 max-w-lg">
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
          <p className="text-xs text-muted-foreground">
            You can assign specific rooms after creation.
          </p>
        </div>

        <Button onClick={handleCreate} disabled={creating || !name.trim() || !propertyId}>
          {creating ? 'Creating...' : 'Create Knowledge Base'}
        </Button>
      </div>
    </div>
  );
}
