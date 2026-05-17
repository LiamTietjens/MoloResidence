'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ChevronDownIcon, PlusIcon, XIcon, Trash2Icon } from 'lucide-react';
import Link from 'next/link';

interface PropertyWithRooms {
  id: string;
  name: string;
  address: string;
  rooms: string[];
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<PropertyWithRooms[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    const { data: propertiesData, error: propError } = await supabase
      .from('properties')
      .select('id, name, address')
      .order('name', { ascending: true });

    if (propError) {
      toast.error(`Failed to load properties: ${propError.message}`);
      setLoading(false);
      return;
    }

    // Fetch all rooms linked through knowledge_bases
    const { data: roomData } = await supabase
      .from('knowledge_base_rooms')
      .select('room_number, knowledge_bases!inner(property_id)')
      .not('knowledge_bases.property_id', 'is', null);

    // Build room map per property
    const roomMap: Record<string, string[]> = {};
    for (const row of roomData ?? []) {
      const kb = row.knowledge_bases as unknown as { property_id: string };
      if (kb?.property_id) {
        if (!roomMap[kb.property_id]) roomMap[kb.property_id] = [];
        if (!roomMap[kb.property_id].includes(row.room_number)) {
          roomMap[kb.property_id].push(row.room_number);
        }
      }
    }

    setProperties(
      (propertiesData ?? []).map((p) => ({
        ...p,
        rooms: (roomMap[p.id] || []).sort(),
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
        <Button render={<Link href="/properties/new" />}>
          <PlusIcon data-icon="inline-start" />
          New Property
        </Button>
      </div>

      {properties.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No properties yet. Create your first property to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {properties.map((property) => (
            <PropertyAccordionItem
              key={property.id}
              property={property}
              isExpanded={expandedId === property.id}
              onToggle={() => toggleExpand(property.id)}
              onUpdate={fetchProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PropertyAccordionItem({
  property,
  isExpanded,
  onToggle,
  onUpdate,
}: {
  property: PropertyWithRooms;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: () => Promise<void>;
}) {
  const [name, setName] = useState(property.name);
  const [address, setAddress] = useState(property.address);
  const [rooms, setRooms] = useState<string[]>(property.rooms);
  const [newRoom, setNewRoom] = useState('');
  const [addingRoom, setAddingRoom] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state if parent re-fetches
  useEffect(() => {
    setName(property.name);
    setAddress(property.address);
    setRooms(property.rooms);
  }, [property]);

  function handleNameChange(value: string) {
    setName(value);
    debouncedSave(value, address);
  }

  function handleAddressChange(value: string) {
    setAddress(value);
    debouncedSave(name, value);
  }

  function debouncedSave(newName: string, newAddress: string) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveProperty(newName, newAddress);
    }, 800);
  }

  async function saveProperty(newName: string, newAddress: string) {
    if (!newName.trim() || !newAddress.trim()) return;

    const { error } = await supabase
      .from('properties')
      .update({ name: newName.trim(), address: newAddress.trim() })
      .eq('id', property.id);

    if (error) {
      toast.error(`Failed to save: ${error.message}`);
    }
  }

  function handleBlur() {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (name.trim() && address.trim()) {
      saveProperty(name, address);
    }
  }

  async function handleAddRoom() {
    if (!newRoom.trim()) return;

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
      .eq('property_id', property.id)
      .eq('kind', 'property')
      .limit(1)
      .single();

    if (existingKb) {
      kbId = existingKb.id;
    } else {
      const { data: newKb, error: kbError } = await supabase
        .from('knowledge_bases')
        .insert({
          name: `${name} — main KB`,
          kind: 'property',
          property_id: property.id,
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
    const { data: kbs } = await supabase
      .from('knowledge_bases')
      .select('id')
      .eq('property_id', property.id);

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
    setDeleting(true);

    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', property.id);

    if (error) {
      toast.error(`Failed to delete: ${error.message}`);
      setDeleting(false);
      return;
    }

    toast.success('Property deleted');
    setDeleteOpen(false);
    await onUpdate();
  }

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <div className="min-w-0">
          <p className="font-medium truncate">{property.name}</p>
          <p className="text-sm text-muted-foreground truncate">
            {property.address}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span className="text-xs text-muted-foreground">
            {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}
          </span>
          <ChevronDownIcon
            className={`size-4 text-muted-foreground transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {isExpanded && (
        <CardContent className="border-t pt-4 space-y-6">
          {/* Editable name + address */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Name
              </label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                onBlur={handleBlur}
                placeholder="Property name"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Address
              </label>
              <Input
                value={address}
                onChange={(e) => handleAddressChange(e.target.value)}
                onBlur={handleBlur}
                placeholder="Full address"
              />
            </div>
          </div>

          {/* Room numbers */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              Room Numbers
            </p>

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
                className="w-36"
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
                size="sm"
                onClick={handleAddRoom}
                disabled={addingRoom || !newRoom.trim()}
              >
                {addingRoom ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </div>

          {/* Delete */}
          <div className="border-t pt-4">
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger
                render={
                  <Button variant="destructive" size="sm" type="button" />
                }
              >
                <Trash2Icon data-icon="inline-start" />
                Delete Property
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Property</DialogTitle>
                  <DialogDescription>
                    This will permanently delete &ldquo;{property.name}&rdquo;
                    and all associated data. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteOpen(false)}
                  >
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
        </CardContent>
      )}
    </Card>
  );
}
