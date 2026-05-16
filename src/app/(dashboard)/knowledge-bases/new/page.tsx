'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { KBForm, type KBFormData } from '../kb-form';

interface Property {
  id: string;
  name: string;
}

export default function NewKnowledgeBasePage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProperties() {
      const { data } = await supabase
        .from('properties')
        .select('id, name')
        .order('name');
      setProperties(data || []);
      setLoading(false);
    }

    fetchProperties();
  }, []);

  async function handleCreate(data: KBFormData) {
    const { data: kb, error } = await supabase
      .from('knowledge_bases')
      .insert({
        name: data.name,
        kind: data.kind,
        property_id: data.kind === 'general' ? null : data.property_id,
        is_default_general: data.kind === 'general' ? data.is_default_general : false,
        content: data.content,
      })
      .select('id')
      .single();

    if (error) {
      return { error: error.message };
    }

    // Insert room assignments for non-general KBs
    if (data.kind !== 'general' && data.room_numbers.length > 0) {
      const roomRows = data.room_numbers.map((room_number) => ({
        knowledge_base_id: kb.id,
        room_number: room_number.trim(),
      }));

      const { error: roomError } = await supabase
        .from('knowledge_base_rooms')
        .insert(roomRows);

      if (roomError) {
        return { error: roomError.message };
      }
    }

    toast.success('Knowledge base created');
    router.push('/knowledge-bases');
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[500px] w-full" />
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        New Knowledge Base
      </h1>
      <KBForm properties={properties} onSubmit={handleCreate} />
    </div>
  );
}
