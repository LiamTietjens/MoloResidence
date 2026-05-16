'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { KBForm, type KBFormData } from '../kb-form';

interface Property {
  id: string;
  name: string;
}

interface KnowledgeBase {
  id: string;
  name: string;
  kind: 'general' | 'property' | 'exception';
  property_id: string | null;
  is_default_general: boolean;
  content: string | null;
  knowledge_base_rooms: { room_number: string }[];
}

function DetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    async function fetchData() {
      const [{ data: kbData }, { data: props }] = await Promise.all([
        supabase
          .from('knowledge_bases')
          .select('*, knowledge_base_rooms(room_number)')
          .eq('id', id!)
          .single(),
        supabase.from('properties').select('id, name').order('name'),
      ]);

      if (!kbData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setKb(kbData as KnowledgeBase);
      setProperties(props || []);
      setLoading(false);
    }

    fetchData();
  }, [id]);

  async function handleUpdate(data: KBFormData) {
    if (!id) return { error: 'No ID provided' };

    const { error } = await supabase
      .from('knowledge_bases')
      .update({
        name: data.name,
        kind: data.kind,
        property_id: data.kind === 'general' ? null : data.property_id,
        is_default_general: data.kind === 'general' ? data.is_default_general : false,
        content: data.content,
      })
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }

    // Re-sync room assignments: delete all then re-insert
    await supabase
      .from('knowledge_base_rooms')
      .delete()
      .eq('knowledge_base_id', id);

    if (data.kind !== 'general' && data.room_numbers.length > 0) {
      const roomRows = data.room_numbers.map((room_number) => ({
        knowledge_base_id: id,
        room_number: room_number.trim(),
      }));

      const { error: roomError } = await supabase
        .from('knowledge_base_rooms')
        .insert(roomRows);

      if (roomError) {
        return { error: roomError.message };
      }
    }

    toast.success('Knowledge base updated');
    router.push('/knowledge-bases');
  }

  async function handleDuplicate() {
    if (!id || !kb) return { error: 'No knowledge base loaded' };

    // Create duplicate
    const { data: duplicate, error: insertError } = await supabase
      .from('knowledge_bases')
      .insert({
        name: `${kb.name} (copy)`,
        kind: kb.kind,
        property_id: kb.property_id,
        is_default_general: false, // Never duplicate the default flag
        content: kb.content,
      })
      .select('id')
      .single();

    if (insertError || !duplicate) {
      return { error: insertError?.message || 'Failed to duplicate' };
    }

    // Copy room assignments
    if (kb.knowledge_base_rooms && kb.knowledge_base_rooms.length > 0) {
      const roomRows = kb.knowledge_base_rooms.map((r) => ({
        knowledge_base_id: duplicate.id,
        room_number: r.room_number,
      }));

      await supabase.from('knowledge_base_rooms').insert(roomRows);
    }

    toast.success('Knowledge base duplicated');
    router.push(`/knowledge-bases/detail?id=${duplicate.id}`);
  }

  async function handleDelete() {
    if (!id) return { error: 'No ID provided' };

    // Delete room assignments first (cascade may not be set up)
    await supabase
      .from('knowledge_base_rooms')
      .delete()
      .eq('knowledge_base_id', id);

    const { error } = await supabase
      .from('knowledge_bases')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }

    toast.success('Knowledge base deleted');
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

  if (notFound || !kb) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Not Found</h1>
        <p className="text-muted-foreground">
          The knowledge base you are looking for does not exist or the ID is missing.
        </p>
      </div>
    );
  }

  const initialData = {
    id: kb.id,
    name: kb.name,
    kind: kb.kind,
    property_id: kb.property_id,
    is_default_general: kb.is_default_general || false,
    content: kb.content || '',
    room_numbers: (kb.knowledge_base_rooms || []).map((r) => r.room_number),
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Edit: {kb.name}
      </h1>
      <KBForm
        properties={properties}
        initialData={initialData}
        onSubmit={handleUpdate}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />
    </div>
  );
}

export default function KnowledgeBaseDetailPage() {
  return (
    <Suspense
      fallback={
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
      }
    >
      <DetailContent />
    </Suspense>
  );
}
