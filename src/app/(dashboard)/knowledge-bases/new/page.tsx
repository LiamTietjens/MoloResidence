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
    // Insert the knowledge base
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

    // Handle room assignments
    if (data.kind !== 'general' && data.property_id) {
      let roomsToAssign: string[] = [];

      if (data.assignment === 'entire_property') {
        // Fetch all rooms for this property and assign them
        const { data: existingRooms } = await supabase
          .from('knowledge_base_rooms')
          .select('room_number')
          .eq('property_id', data.property_id);

        if (existingRooms && existingRooms.length > 0) {
          roomsToAssign = [...new Set(existingRooms.map((r: { room_number: string }) => r.room_number))];
        }
      } else {
        roomsToAssign = data.room_numbers;
      }

      if (roomsToAssign.length > 0) {
        const roomRows = roomsToAssign.map((room_number) => ({
          knowledge_base_id: kb.id,
          property_id: data.property_id,
          room_number: room_number.trim(),
        }));

        const { error: roomError } = await supabase
          .from('knowledge_base_rooms')
          .insert(roomRows);

        if (roomError) {
          return { error: roomError.message };
        }
      }
    }

    toast.success('Knowledge base created');
    router.push('/knowledge-bases');
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
          <Skeleton className="h-[300px] w-full" />
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
