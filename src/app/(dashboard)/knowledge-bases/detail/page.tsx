'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Trash2Icon,
  Check,
  Loader2,
  Minus,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
} from 'lucide-react';

interface Property {
  id: string;
  name: string;
}

interface RoomAssignment {
  room_number: string;
  property_id: string;
  knowledge_base_id: string;
  kb_name: string;
}

interface KnowledgeBase {
  id: string;
  name: string;
  content: string | null;
}

interface PropertyRooms {
  property: Property;
  rooms: string[];
}

function DetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Markdown editor state
  const [editorTab, setEditorTab] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Room assignment state
  const [propertyRooms, setPropertyRooms] = useState<PropertyRooms[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [allAssignments, setAllAssignments] = useState<RoomAssignment[]>([]);

  // Save state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Debounce timers
  const contentTimerRef = useRef<NodeJS.Timeout | null>(null);
  const roomTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load data
  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    async function fetchData() {
      const [{ data: kbData }, { data: properties }, { data: allRoomData }] = await Promise.all([
        supabase
          .from('knowledge_bases')
          .select('id, name, content')
          .eq('id', id!)
          .single(),
        supabase.from('properties').select('id, name').order('name'),
        // Fetch ALL room assignments joined through knowledge_bases to get property_id
        supabase
          .from('knowledge_base_rooms')
          .select('room_number, knowledge_base_id, knowledge_bases(id, name, property_id)')
          .order('room_number'),
      ]);

      if (!kbData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setKb(kbData as KnowledgeBase);
      setName(kbData.name);
      setContent(kbData.content || '');

      // Build all assignments - property_id comes from the joined knowledge_bases
      const assignments: RoomAssignment[] = (allRoomData || []).map((r: Record<string, unknown>) => {
        const kbJoin = r.knowledge_bases as { id: string; name: string; property_id: string } | null;
        return {
          room_number: r.room_number as string,
          property_id: kbJoin?.property_id || '',
          knowledge_base_id: r.knowledge_base_id as string,
          kb_name: kbJoin?.name || 'Unknown',
        };
      });
      setAllAssignments(assignments);

      // Group rooms by property
      const roomsByProperty = new Map<string, Set<string>>();
      for (const assignment of assignments) {
        if (!assignment.property_id) continue;
        if (!roomsByProperty.has(assignment.property_id)) {
          roomsByProperty.set(assignment.property_id, new Set());
        }
        roomsByProperty.get(assignment.property_id)!.add(assignment.room_number);
      }

      // Build property rooms list
      const propRooms: PropertyRooms[] = (properties || []).map((p: Property) => {
        const rooms = roomsByProperty.get(p.id) || new Set<string>();
        const sortedRooms = [...rooms].sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true })
        );
        return { property: p, rooms: sortedRooms };
      });
      setPropertyRooms(propRooms);

      // Set initial selected rooms for THIS KB
      const thisKbRooms = assignments.filter((a) => a.knowledge_base_id === id);
      const selected = new Set<string>(
        thisKbRooms.map((a) => `${a.property_id}:${a.room_number}`)
      );
      setSelectedRooms(selected);

      setLoading(false);
    }

    fetchData();
  }, [id]);

  // Auto-save name on blur
  const saveName = useCallback(
    async (newName: string) => {
      if (!id || !newName.trim()) return;
      setSaveStatus('saving');
      const { error } = await supabase
        .from('knowledge_bases')
        .update({ name: newName.trim() })
        .eq('id', id);
      if (error) {
        toast.error('Failed to save name');
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    },
    [id]
  );

  // Debounced content save
  const saveContent = useCallback(
    async (newContent: string) => {
      if (!id) return;
      setSaveStatus('saving');
      const { error } = await supabase
        .from('knowledge_bases')
        .update({ content: newContent })
        .eq('id', id);
      if (error) {
        toast.error('Failed to save content');
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    },
    [id]
  );

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (contentTimerRef.current) clearTimeout(contentTimerRef.current);
    contentTimerRef.current = setTimeout(() => {
      saveContent(newContent);
    }, 1000);
  };

  // Markdown toolbar actions
  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const before = content.substring(0, start);
    const after = content.substring(end);

    const newContent = before + prefix + selectedText + suffix + after;
    handleContentChange(newContent);

    // Restore cursor position after state update
    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPos = start + prefix.length + selectedText.length + suffix.length;
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    });
  };

  const toolbarActions = [
    { icon: Heading1, label: 'Heading 1', action: () => insertMarkdown('# ') },
    { icon: Heading2, label: 'Heading 2', action: () => insertMarkdown('## ') },
    { icon: Heading3, label: 'Heading 3', action: () => insertMarkdown('### ') },
    { icon: Bold, label: 'Bold', action: () => insertMarkdown('**', '**') },
    { icon: Italic, label: 'Italic', action: () => insertMarkdown('*', '*') },
    { icon: List, label: 'Bullet List', action: () => insertMarkdown('- ') },
    { icon: ListOrdered, label: 'Numbered List', action: () => insertMarkdown('1. ') },
  ];

  // Save room assignments
  const saveRoomAssignments = useCallback(
    async (rooms: Set<string>) => {
      if (!id) return;
      setSaveStatus('saving');

      // Delete existing assignments for this KB
      await supabase
        .from('knowledge_base_rooms')
        .delete()
        .eq('knowledge_base_id', id);

      // Insert new assignments (only knowledge_base_id and room_number - no property_id column)
      const roomRows = [...rooms].map((key) => {
        const [, room_number] = key.split(':');
        return { knowledge_base_id: id, room_number };
      });

      if (roomRows.length > 0) {
        const { error } = await supabase
          .from('knowledge_base_rooms')
          .insert(roomRows);
        if (error) {
          toast.error('Failed to save room assignments');
          setSaveStatus('idle');
          return;
        }
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    },
    [id]
  );

  const debouncedSaveRooms = useCallback(
    (rooms: Set<string>) => {
      if (roomTimerRef.current) clearTimeout(roomTimerRef.current);
      roomTimerRef.current = setTimeout(() => {
        saveRoomAssignments(rooms);
      }, 600);
    },
    [saveRoomAssignments]
  );

  // Toggle a single room
  const toggleRoom = (propertyId: string, roomNumber: string) => {
    const key = `${propertyId}:${roomNumber}`;
    setSelectedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      debouncedSaveRooms(next);
      return next;
    });
  };

  // Toggle all rooms for a property
  const toggleProperty = (propertyId: string, rooms: string[]) => {
    setSelectedRooms((prev) => {
      const next = new Set(prev);
      const allSelected = rooms.every((r) => next.has(`${propertyId}:${r}`));

      if (allSelected) {
        rooms.forEach((r) => next.delete(`${propertyId}:${r}`));
      } else {
        rooms.forEach((r) => next.add(`${propertyId}:${r}`));
      }
      debouncedSaveRooms(next);
      return next;
    });
  };

  // Get property checkbox state
  const getPropertyCheckState = (propertyId: string, rooms: string[]): 'none' | 'all' | 'partial' => {
    if (rooms.length === 0) return 'none';
    const selectedCount = rooms.filter((r) => selectedRooms.has(`${propertyId}:${r}`)).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === rooms.length) return 'all';
    return 'partial';
  };

  // Check if a room is assigned to another KB
  const getOtherKbAssignment = (propertyId: string, roomNumber: string): string | null => {
    const assignment = allAssignments.find(
      (a) =>
        a.property_id === propertyId &&
        a.room_number === roomNumber &&
        a.knowledge_base_id !== id
    );
    return assignment ? assignment.kb_name : null;
  };

  // Delete KB
  async function handleDelete() {
    if (!id) return;
    setDeleteDialogOpen(false);

    await supabase
      .from('knowledge_base_rooms')
      .delete()
      .eq('knowledge_base_id', id);

    const { error } = await supabase
      .from('knowledge_bases')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Knowledge base deleted');
    router.push('/knowledge-bases');
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  if (notFound || !kb) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Not Found</h1>
        <p className="text-muted-foreground">
          The knowledge base you are looking for does not exist or the ID is missing.
        </p>
      </div>
    );
  }

  const totalSelectedRooms = selectedRooms.size;

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" render={<Link href="/knowledge-bases" />}>
              <ArrowLeft />
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight">Edit Knowledge Base</h1>
          </div>
          <SaveIndicator status={saveStatus} />
        </div>

        {/* Name field */}
        <div className="space-y-2">
          <Label htmlFor="kb-name">Name</Label>
          <Input
            id="kb-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name.trim() !== kb.name) {
                saveName(name);
              }
            }}
            placeholder="Knowledge base name..."
          />
        </div>

        {/* Markdown Editor */}
        <div className="space-y-2">
          <Label>Content</Label>
          <div className="rounded-lg border overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-1 border-b bg-muted/30 px-2 py-1.5">
              {toolbarActions.map((item) => (
                <Tooltip key={item.label}>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        onClick={item.action}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      />
                    }
                  >
                    <item.icon className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>{item.label}</TooltipContent>
                </Tooltip>
              ))}

              {/* Tab switcher */}
              <div className="ml-auto flex items-center rounded-md bg-muted p-0.5">
                <button
                  type="button"
                  onClick={() => setEditorTab('edit')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    editorTab === 'edit'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab('preview')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    editorTab === 'preview'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>

            {/* Editor / Preview area */}
            {editorTab === 'edit' ? (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Enter the knowledge base content the AI agent will use..."
                className="w-full min-h-[400px] p-4 font-mono text-sm leading-relaxed bg-background resize-y outline-none"
              />
            ) : (
              <div className="min-h-[400px] p-4 prose prose-sm dark:prose-invert max-w-none overflow-auto">
                {content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                ) : (
                  <p className="text-muted-foreground italic">No content yet.</p>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {content.length.toLocaleString()} characters &middot; Auto-saves as you type
          </p>
        </div>

        <Separator />

        {/* Assign Rooms & Properties */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Assign Rooms &amp; Properties</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select which rooms this knowledge base applies to.
              {totalSelectedRooms > 0 && (
                <span className="ml-1 font-medium text-foreground">
                  {totalSelectedRooms} room{totalSelectedRooms === 1 ? '' : 's'} selected.
                </span>
              )}
            </p>
          </div>

          <div className="space-y-4">
            {propertyRooms.map(({ property, rooms }) => {
              if (rooms.length === 0) return null;

              const checkState = getPropertyCheckState(property.id, rooms);

              return (
                <div
                  key={property.id}
                  className="rounded-lg border p-4 space-y-3"
                >
                  {/* Property header with checkbox */}
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <PropertyCheckbox
                      state={checkState}
                      onChange={() => toggleProperty(property.id, rooms)}
                    />
                    <span className="font-medium text-sm">{property.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({rooms.length} room{rooms.length === 1 ? '' : 's'})
                    </span>
                  </label>

                  {/* Room badges */}
                  <div className="flex flex-wrap gap-1.5 pl-7">
                    {rooms.map((room) => {
                      const key = `${property.id}:${room}`;
                      const isSelected = selectedRooms.has(key);
                      const otherKb = getOtherKbAssignment(property.id, room);

                      return (
                        <RoomBadge
                          key={key}
                          room={room}
                          isSelected={isSelected}
                          otherKbName={otherKb}
                          onClick={() => toggleRoom(property.id, room)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {propertyRooms.every((pr) => pr.rooms.length === 0) && (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
                No rooms found. Room data is populated from existing knowledge base assignments.
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Delete section */}
        <div className="pb-8">
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger
              render={
                <Button variant="destructive" />
              }
            >
              <Trash2Icon data-icon="inline-start" />
              Delete Knowledge Base
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Knowledge Base</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete &quot;{kb.name}&quot;?
                  {totalSelectedRooms > 0 && (
                    <>
                      {' '}This will also remove {totalSelectedRooms} room assignment
                      {totalSelectedRooms === 1 ? '' : 's'}.
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
        </div>
      </div>
    </TooltipProvider>
  );
}

// Property checkbox component (supports indeterminate state)
function PropertyCheckbox({
  state,
  onChange,
}: {
  state: 'none' | 'all' | 'partial';
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`
        flex items-center justify-center h-4 w-4 rounded border transition-colors shrink-0
        ${state === 'all'
          ? 'bg-primary border-primary text-primary-foreground'
          : state === 'partial'
          ? 'bg-primary/70 border-primary text-primary-foreground'
          : 'border-input bg-transparent hover:border-ring'
        }
      `}
    >
      {state === 'all' && <Check className="h-3 w-3" />}
      {state === 'partial' && <Minus className="h-3 w-3" />}
    </button>
  );
}

// Room badge component
function RoomBadge({
  room,
  isSelected,
  otherKbName,
  onClick,
}: {
  room: string;
  isSelected: boolean;
  otherKbName: string | null;
  onClick: () => void;
}) {
  const badge = (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium
        transition-all cursor-pointer select-none border
        ${isSelected
          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
          : otherKbName
          ? 'bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-300 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700'
          : 'bg-transparent text-muted-foreground border-border hover:border-ring hover:text-foreground'
        }
      `}
    >
      {room}
      {otherKbName && !isSelected && (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
      )}
    </button>
  );

  if (otherKbName && !isSelected) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span />}>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          Already assigned to: {otherKbName}
        </TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}

// Save status indicator
function SaveIndicator({ status }: { status: 'idle' | 'saving' | 'saved' }) {
  if (status === 'idle') return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {status === 'saving' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="h-3 w-3 text-green-600" />
          <span className="text-green-600">Saved</span>
        </>
      )}
    </div>
  );
}

export default function KnowledgeBaseDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      }
    >
      <DetailContent />
    </Suspense>
  );
}
