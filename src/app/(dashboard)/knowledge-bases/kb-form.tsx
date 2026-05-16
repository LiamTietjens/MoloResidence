'use client';

import { useState, useCallback, KeyboardEvent } from 'react';
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
  const [roomNumbers, setRoomNumbers] = useState<string[]>(
    initialData?.room_numbers || []
  );
  const [roomInput, setRoomInput] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isEditing = !!initialData;
  const busy = isPending || submitting;

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="is_default_general">
              Default general knowledge base (loaded at every call start)
            </Label>
          </div>
        )}

        {kind !== 'general' && (
          <>
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={propertyId} onValueChange={(val) => setPropertyId(val || '')}>
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

            <div className="space-y-2">
              <Label>Room Numbers</Label>
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-2 min-h-[2rem] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
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
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter the knowledge base content the AI agent will use..."
            className="font-mono min-h-[500px]"
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
            <CardTitle>What the AI will see</CardTitle>
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
              </div>

              {kind !== 'general' && propertyId && (
                <div className="text-sm text-muted-foreground">
                  Property:{' '}
                  <span className="text-foreground font-medium">
                    {properties.find((p) => p.id === propertyId)?.name || 'Unknown'}
                  </span>
                </div>
              )}

              {roomNumbers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {roomNumbers.map((room) => (
                    <Badge key={room} variant="outline">
                      Room {room}
                    </Badge>
                  ))}
                </div>
              )}

              <Separator />

              <div className="rounded-md bg-muted/50 p-4 max-h-[600px] overflow-y-auto">
                {content ? (
                  <pre className="font-mono text-sm whitespace-pre-wrap break-words text-foreground">
                    {content}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No content yet. Start typing in the content field to preview.
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
