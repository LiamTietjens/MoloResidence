'use client';

import { Suspense } from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { XIcon } from 'lucide-react';
import Link from 'next/link';

function PropertyDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  // Room state
  const [rooms, setRooms] = useState<string[]>([]);
  const [newRoom, setNewRoom] = useState('');
  const [addingRoom, setAddingRoom] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchRooms = useCallback(async () => {
    if (!id) return;

    const { data } = await supabase
      .from('knowledge_base_rooms')
      .select('room_number, knowledge_bases!inner(property_id)')
      .eq('knowledge_bases.property_id', id);

    if (data) {
      const roomNumbers = data.map(
        (r) => r.room_number
      );
      setRooms([...new Set(roomNumbers)].sort());
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    async function fetchProperty() {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, address')
        .eq('id', id)
        .single();

      if (error || !data) {
        toast.error('Property not found');
        router.push('/properties');
        return;
      }

      setName(data.name || '');
      setAddress(data.address || '');
      setLoading(false);
    }

    fetchProperty();
    fetchRooms();
  }, [id, router, fetchRooms]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !address.trim()) {
      toast.error('Name and address are required.');
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('properties')
      .update({ name: name.trim(), address: address.trim() })
      .eq('id', id!);

    if (error) {
      toast.error(`Failed to save: ${error.message}`);
    } else {
      toast.success('Property updated');
    }

    setSaving(false);
  }

  async function handleAddRoom() {
    if (!newRoom.trim() || !id) return;

    const roomNumber = newRoom.trim();

    if (rooms.includes(roomNumber)) {
      toast.error('Room already exists.');
      return;
    }

    setAddingRoom(true);

    // Find or create a property-kind KB for this property
    let kbId: string | null = null;

    const { data: existingKb } = await supabase
      .from('knowledge_bases')
      .select('id')
      .eq('property_id', id)
      .eq('kind', 'property')
      .limit(1)
      .single();

    if (existingKb) {
      kbId = existingKb.id;
    } else {
      // Create a property KB
      const { data: newKb, error: kbError } = await supabase
        .from('knowledge_bases')
        .insert({
          name: `${name} — main KB`,
          kind: 'property',
          property_id: id,
        })
        .select('id')
        .single();

      if (kbError || !newKb) {
        toast.error(`Failed to create KB: ${kbError?.message}`);
        setAddingRoom(false);
        return;
      }

      kbId = newKb.id;
    }

    // Insert the room
    const { error: roomError } = await supabase
      .from('knowledge_base_rooms')
      .insert({ knowledge_base_id: kbId, room_number: roomNumber });

    if (roomError) {
      toast.error(`Failed to add room: ${roomError.message}`);
    } else {
      setRooms((prev) => [...prev, roomNumber].sort());
      setNewRoom('');
    }

    setAddingRoom(false);
  }

  async function handleRemoveRoom(roomNumber: string) {
    if (!id) return;

    // Get KB IDs for this property
    const { data: kbs } = await supabase
      .from('knowledge_bases')
      .select('id')
      .eq('property_id', id);

    if (!kbs || kbs.length === 0) return;

    const kbIds = kbs.map((kb) => kb.id);

    const { error } = await supabase
      .from('knowledge_base_rooms')
      .delete()
      .in('knowledge_base_id', kbIds)
      .eq('room_number', roomNumber);

    if (error) {
      toast.error(`Failed to remove room: ${error.message}`);
    } else {
      setRooms((prev) => prev.filter((r) => r !== roomNumber));
    }
  }

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);

    const { error } = await supabase.from('properties').delete().eq('id', id);

    if (error) {
      toast.error(`Failed to delete: ${error.message}`);
      setDeleting(false);
      return;
    }

    toast.success('Property deleted');
    router.push('/properties');
  }

  if (!id) {
    return (
      <div className="max-w-lg">
        <p className="text-destructive">
          No property ID provided.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-lg space-y-8">
        <h1 className="text-2xl font-semibold tracking-tight">Property</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-10">
      {/* Property Details */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Property</h1>
          <Button variant="outline" render={<Link href="/properties" />}>
            Back
          </Button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Property name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address"
              required
            />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </div>

      {/* Room Numbers */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium tracking-tight">Room Numbers</h2>

        {rooms.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {rooms.map((room) => (
              <Badge
                key={room}
                variant="secondary"
                className="gap-1.5 pl-2.5 pr-1.5 py-1 h-auto text-sm"
              >
                {room}
                <button
                  type="button"
                  onClick={() => handleRemoveRoom(room)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No rooms assigned yet.
          </p>
        )}

        <div className="flex items-center gap-2">
          <Input
            value={newRoom}
            onChange={(e) => setNewRoom(e.target.value)}
            placeholder="Room number"
            className="w-40"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddRoom();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddRoom}
            disabled={addingRoom || !newRoom.trim()}
          >
            {addingRoom ? 'Adding...' : 'Add'}
          </Button>
        </div>
      </div>

      {/* Delete */}
      <div className="border-t pt-8">
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger render={<Button variant="destructive" type="button" />}>
            Delete Property
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Property</DialogTitle>
              <DialogDescription>
                This will permanently delete this property and all associated
                data. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function PropertyDetailPage() {
  return (
    <Suspense fallback={<div className="max-w-lg"><p className="text-muted-foreground">Loading...</p></div>}>
      <PropertyDetail />
    </Suspense>
  );
}
