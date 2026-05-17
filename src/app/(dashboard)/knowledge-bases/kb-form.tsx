'use client';

import { useState, useEffect, useCallback, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { XIcon, CopyIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-browser';

interface Property {
  id: string;
  name: string;
}

export interface KBFormData {
  name: string;
  kind: 'general' | 'property' | 'exception';
  property_id: string | null;
  is_default_general: boolean;
  content: string;
  room_numbers: string[];
  assignment: 'entire_property' | 'specific_rooms';
}

interface KBFormProps {
  properties: Property[];
  initialData?: {
    id: string;
    name: string;
    kind: 'general' | 'property' | 'exception';
    property_id: string | null;
    is_default_general: boolean;
    content: string;
    room_numbers: string[];
    assignment: 'entire_property' | 'specific_rooms';
  };
  onSubmit: (data: KBFormData) => Promise<{ error?: string } | void>;
  onDuplicate?: () => Promise<{ error?: string } | void>;
  onDelete?: () => Promise<{ error?: string } | void>;
  submitting?: boolean;
}

export function KBForm({
  properties,
  initialData,
  onSubmit,
  onDuplicate,
  onDelete,
  submitting = false,
}: KBFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [kind, setKind] = useState<'general' | 'property' | 'exception'>(
    initialData?.kind || 'general'
  );
  const [propertyId, setPropertyId] = useState(initialData?.property_id || '');
  const [isDefaultGeneral, setIsDefaultGeneral] = useState(
    initialData?.is_default_general || false
  );
  const [content, setContent] = useState(initialData?.content || '');
  const [assignment, setAssignment] = useState<'entire_property' | 'specific_rooms'>(
    initialData?.assignment || 'entire_property'
  );
  const [roomNumbers, setRoomNumbers] = useState<string[]>(
    initialData?.room_numbers || []
  );
  const [roomInput, setRoomInput] = useState('');
  const [availableRooms, setAvailableRooms] = useState<string[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isEditing = !!initialData;
  const busy = isPending || submitting;

  // Fetch available rooms when property changes
  useEffect(() => {
    if (!propertyId || kind === 'general') {
      setAvailableRooms([]);
      return;
    }

    async function fetchRooms() {
      const { data } = await supabase
        .from('knowledge_base_rooms')
        .select('room_number')
        .eq('property_id', propertyId);

      if (data) {
        const rooms = [...new Set(data.map((r: { room_number: string }) => r.room_number))];
        rooms.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        setAvailableRooms(rooms);
      }
    }

    fetchRooms();
  }, [propertyId, kind]);

  const handleAddRoom = useCallback(
    (input: string) => {
      const newRooms = input
        .split(',')
        .map((r) => r.trim())
        .filter((r) => r.length > 0 && !roomNumbers.includes(r));
      if (newRooms.length > 0) {
        setRoomNumbers((prev) => [...prev, ...newRooms]);
      }
      setRoomInput('');
    },
    [roomNumbers]
  );

  const handleRoomKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddRoom(roomInput);
    }
    if (e.key === 'Backspace' && roomInput === '' && roomNumbers.length > 0) {
      setRoomNumbers((prev) => prev.slice(0, -1));
    }
  };

  const removeRoom = (room: string) => {
    setRoomNumbers((prev) => prev.filter((r) => r !== room));
  };

  const toggleRoom = (room: string) => {
    if (roomNumbers.includes(room)) {
      removeRoom(room);
    } else {
      setRoomNumbers((prev) => [...prev, room]);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (kind !== 'general' && !propertyId) {
      toast.error('Property is required for this KB kind');
      return;
    }

    setIsPending(true);
    try {
      const result = await onSubmit({
        name: name.trim(),
        kind,
        property_id: kind === 'general' ? null : propertyId,
        is_default_general: kind === 'general' ? isDefaultGeneral : false,
        content,
        room_numbers: kind === 'general' ? [] : roomNumbers,
        assignment: kind === 'general' ? 'entire_property' : assignment,
      });
      if (result && 'error' in result && result.error) {
        toast.error(result.error);
      }
    } finally {
      setIsPending(false);
    }
  };

  const handleDuplicate = async () => {
    if (!onDuplicate) return;
    setIsPending(true);
    try {
      const result = await onDuplicate();
      if (result && 'error' in result && result.error) {
        toast.error(result.error);
      }
    } finally {
      setIsPending(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleteDialogOpen(false);
    setIsPending(true);
    try {
      const result = await onDelete();
      if (result && 'error' in result && result.error) {
        toast.error(result.error);
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left: Form */}
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="e.g. General Guest Instructions"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Kind</Label>
          <Tabs
            value={kind}
            onValueChange={(val) => {
              const newKind = val as 'general' | 'property' | 'exception';
              setKind(newKind);
              if (newKind === 'general') {
                setPropertyId('');
                setRoomNumbers([]);
                setAssignment('entire_property');
              }
            }}
          >
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="property">Property</TabsTrigger>
              <TabsTrigger value="exception">Exception</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {kind === 'general' && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_default_general"
              checked={isDefaultGeneral}
              onChange={(e) => setIsDefaultGeneral(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <Label htmlFor="is_default_general">
              Default general KB (loaded at every call start)
            </Label>
          </div>
        )}

        {kind !== 'general' && (
          <>
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={propertyId} onValueChange={(val) => {
                setPropertyId(val || '');
                setRoomNumbers([]);
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a property..." />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {propertyId && (
              <div className="space-y-3">
                <Label>Room Assignment</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="assignment"
                      value="entire_property"
                      checked={assignment === 'entire_property'}
                      onChange={() => {
                        setAssignment('entire_property');
                        setRoomNumbers([]);
                      }}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm">Entire property</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="assignment"
                      value="specific_rooms"
                      checked={assignment === 'specific_rooms'}
                      onChange={() => setAssignment('specific_rooms')}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm">Specific rooms</span>
                  </label>
                </div>

                {assignment === 'entire_property' && (
                  <p className="text-xs text-muted-foreground">
                    This KB will apply to all rooms in the selected property.
                  </p>
                )}

                {assignment === 'specific_rooms' && (
                  <div className="space-y-3">
                    {availableRooms.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Select from known rooms or type new ones below:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {availableRooms.map((room) => (
                            <Badge
                              key={room}
                              variant={roomNumbers.includes(room) ? 'default' : 'outline'}
                              className="cursor-pointer select-none"
                              onClick={() => toggleRoom(room)}
                            >
                              {room}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-2 min-h-[2.5rem] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                      {roomNumbers.map((room) => (
                        <Badge key={room} variant="secondary" className="gap-1">
                          {room}
                          <button
                            type="button"
                            onClick={() => removeRoom(room)}
                            className="ml-0.5 hover:text-destructive"
                          >
                            <XIcon className="size-3" />
                          </button>
                        </Badge>
                      ))}
                      <input
                        value={roomInput}
                        onChange={(e) => setRoomInput(e.target.value)}
                        onKeyDown={handleRoomKeyDown}
                        onBlur={() => {
                          if (roomInput.trim()) handleAddRoom(roomInput);
                        }}
                        placeholder={
                          roomNumbers.length === 0
                            ? 'Type room numbers, separated by commas...'
                            : ''
                        }
                        className="flex-1 min-w-24 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Press Enter or comma to add. Backspace to remove the last room.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter the knowledge base content the AI agent will use..."
            className="font-mono min-h-[400px] text-sm leading-relaxed"
          />
          <p className="text-xs text-muted-foreground">
            {content.length.toLocaleString()} characters
          </p>
        </div>

        <Separator />

        <div className="flex items-center gap-2">
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Knowledge Base'}
          </Button>

          {isEditing && onDuplicate && (
            <Button
              variant="outline"
              onClick={handleDuplicate}
              disabled={busy}
            >
              <CopyIcon data-icon="inline-start" />
              Duplicate
            </Button>
          )}

          {isEditing && onDelete && (
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger
                render={
                  <Button variant="destructive" disabled={busy} />
                }
              >
                <Trash2Icon data-icon="inline-start" />
                Delete
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Knowledge Base</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete &quot;{initialData?.name}&quot;?
                    {roomNumbers.length > 0 && (
                      <>
                        {' '}This will also remove {roomNumbers.length} room assignment
                        {roomNumbers.length === 1 ? '' : 's'}.
                      </>
                    )}
                    {' '}This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Cancel
                  </DialogClose>
                  <Button variant="destructive" onClick={handleDelete}>
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Right: Preview */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    kind === 'general'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      : kind === 'property'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                  }
                  variant="secondary"
                >
                  {kind}
                </Badge>
                {isDefaultGeneral && kind === 'general' && (
                  <Badge variant="outline">Default</Badge>
                )}
                {kind !== 'general' && assignment === 'entire_property' && (
                  <Badge variant="outline">All rooms</Badge>
                )}
              </div>

              {kind !== 'general' && propertyId && (
                <div className="text-sm text-muted-foreground">
                  Property:{' '}
                  <span className="text-foreground font-medium">
                    {properties.find((p) => p.id === propertyId)?.name || 'Unknown'}
                  </span>
                </div>
              )}

              {assignment === 'specific_rooms' && roomNumbers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {roomNumbers.map((room) => (
                    <Badge key={room} variant="outline">
                      Room {room}
                    </Badge>
                  ))}
                </div>
              )}

              <Separator />

              <div className="rounded-md bg-muted/50 p-4 max-h-[500px] overflow-y-auto">
                {content ? (
                  <pre className="font-mono text-sm whitespace-pre-wrap break-words text-foreground leading-relaxed">
                    {content}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No content yet. Start typing to preview.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
