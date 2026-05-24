'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  ChevronRight,
  Building2,
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

interface ReassignConfirmation {
  type: 'single' | 'property';
  propertyId: string;
  roomNumber?: string;
  otherKbName?: string;
  affectedRooms?: { room: string; kbName: string }[];
}

function DetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Room assignment state
  const [propertyRooms, setPropertyRooms] = useState<PropertyRooms[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [allAssignments, setAllAssignments] = useState<RoomAssignment[]>([]);
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());

  // Save state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Reassignment confirmation state
  const [reassignConfirm, setReassignConfirm] = useState<ReassignConfirmation | null>(null);

  // Debounce timer for content
  const contentTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Turndown service for HTML -> Markdown
  const turndownService = useRef(new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
  }));

  // Tiptap editor
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your knowledge base content here...\n\nMarkdown shortcuts:\n  # Heading 1    ## Heading 2    ### Heading 3\n  - Bullet list    1. Numbered list\n  > Blockquote    --- Divider',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none min-h-[500px] w-full p-4 outline-none focus:outline-none',
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (contentTimerRef.current) clearTimeout(contentTimerRef.current);
      contentTimerRef.current = setTimeout(() => {
        const html = ed.getHTML();
        const markdown = turndownService.current.turndown(html);
        saveContent(markdown);
      }, 1000);
    },
  });

  // Load data
  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    async function fetchData() {
      const [{ data: kbData }, { data: properties }, { data: propRoomData }, { data: allKbRoomData }] = await Promise.all([
        supabase
          .from('knowledge_bases')
          .select('id, name, content')
          .eq('id', id!)
          .single(),
        supabase.from('properties').select('id, name').order('name'),
        // Room list comes from property_rooms (stable, not affected by KB unassignment)
        supabase
          .from('property_rooms')
          .select('property_id, room_number')
          .order('room_number'),
        // KB assignments still come from knowledge_base_rooms
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

      // Set editor content from markdown
      if (editor && kbData.content) {
        const html = await marked(kbData.content);
        editor.commands.setContent(html);
      }

      // Build all KB assignments (for showing which rooms are assigned to which KBs)
      const assignments: RoomAssignment[] = (allKbRoomData || []).map((r: Record<string, unknown>) => {
        const kbJoin = r.knowledge_bases as { id: string; name: string; property_id: string } | null;
        return {
          room_number: r.room_number as string,
          property_id: kbJoin?.property_id || '',
          knowledge_base_id: r.knowledge_base_id as string,
          kb_name: kbJoin?.name || 'Unknown',
        };
      });
      setAllAssignments(assignments);

      // Group rooms by property from property_rooms (stable source)
      const roomsByProperty = new Map<string, Set<string>>();
      for (const row of propRoomData || []) {
        if (!roomsByProperty.has(row.property_id)) {
          roomsByProperty.set(row.property_id, new Set());
        }
        roomsByProperty.get(row.property_id)!.add(row.room_number);
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

      // Auto-expand properties that have selected rooms
      const propsWithSelection = new Set<string>();
      for (const key of selected) {
        propsWithSelection.add(key.split(':')[0]);
      }
      setExpandedProperties(propsWithSelection);

      setLoading(false);
    }

    fetchData();
  }, [id, editor]);

  // Set editor content once editor is ready and we have data
  useEffect(() => {
    if (editor && kb?.content && !editor.getText().trim()) {
      (async () => {
        const html = await marked(kb.content || '');
        editor.commands.setContent(html);
      })();
    }
  }, [editor, kb]);

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

  // Save content (markdown)
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

  // Save room assignments
  const saveRoomAssignments = useCallback(
    async (rooms: Set<string>) => {
      if (!id) return;
      setSaveStatus('saving');

      await supabase
        .from('knowledge_base_rooms')
        .delete()
        .eq('knowledge_base_id', id);

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

  // Remove room from another KB
  const removeFromOtherKb = useCallback(
    async (otherKbId: string, roomNumber: string) => {
      await supabase
        .from('knowledge_base_rooms')
        .delete()
        .eq('knowledge_base_id', otherKbId)
        .eq('room_number', roomNumber);
    },
    []
  );

  // Toggle property expansion
  const togglePropertyExpand = (propertyId: string) => {
    setExpandedProperties((prev) => {
      const next = new Set(prev);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
      }
      return next;
    });
  };

  // Toggle a single room (with reassignment check)
  const toggleRoom = (propertyId: string, roomNumber: string) => {
    const key = `${propertyId}:${roomNumber}`;

    if (selectedRooms.has(key)) {
      const next = new Set(selectedRooms);
      next.delete(key);
      setSelectedRooms(next);
      saveRoomAssignments(next);
      return;
    }

    const otherAssignment = allAssignments.find(
      (a) =>
        a.property_id === propertyId &&
        a.room_number === roomNumber &&
        a.knowledge_base_id !== id
    );

    if (otherAssignment) {
      setReassignConfirm({
        type: 'single',
        propertyId,
        roomNumber,
        otherKbName: otherAssignment.kb_name,
      });
    } else {
      const next = new Set(selectedRooms);
      next.add(key);
      setSelectedRooms(next);
      saveRoomAssignments(next);
    }
  };

  // Confirm single room reassignment
  const confirmSingleReassign = async () => {
    if (!reassignConfirm || reassignConfirm.type !== 'single') return;

    const { propertyId, roomNumber } = reassignConfirm;
    const key = `${propertyId}:${roomNumber!}`;

    const otherAssignment = allAssignments.find(
      (a) =>
        a.property_id === propertyId &&
        a.room_number === roomNumber &&
        a.knowledge_base_id !== id
    );
    if (otherAssignment) {
      await removeFromOtherKb(otherAssignment.knowledge_base_id, roomNumber!);
      setAllAssignments((prev) =>
        prev.filter(
          (a) =>
            !(a.knowledge_base_id === otherAssignment.knowledge_base_id &&
              a.room_number === roomNumber)
        )
      );
    }

    const next = new Set(selectedRooms);
    next.add(key);
    setSelectedRooms(next);
    saveRoomAssignments(next);
    setReassignConfirm(null);
  };

  // Toggle all rooms for a property (with reassignment check)
  const toggleProperty = (propertyId: string, rooms: string[]) => {
    const allSelected = rooms.every((r) => selectedRooms.has(`${propertyId}:${r}`));

    if (allSelected) {
      const next = new Set(selectedRooms);
      rooms.forEach((r) => next.delete(`${propertyId}:${r}`));
      setSelectedRooms(next);
      saveRoomAssignments(next);
      return;
    }

    const affectedRooms: { room: string; kbName: string; kbId: string }[] = [];
    for (const room of rooms) {
      if (selectedRooms.has(`${propertyId}:${room}`)) continue;
      const otherAssignment = allAssignments.find(
        (a) =>
          a.property_id === propertyId &&
          a.room_number === room &&
          a.knowledge_base_id !== id
      );
      if (otherAssignment) {
        affectedRooms.push({
          room,
          kbName: otherAssignment.kb_name,
          kbId: otherAssignment.knowledge_base_id,
        });
      }
    }

    if (affectedRooms.length > 0) {
      setReassignConfirm({
        type: 'property',
        propertyId,
        affectedRooms: affectedRooms.map((a) => ({ room: a.room, kbName: a.kbName })),
      });
    } else {
      const next = new Set(selectedRooms);
      rooms.forEach((r) => next.add(`${propertyId}:${r}`));
      setSelectedRooms(next);
      saveRoomAssignments(next);
    }
  };

  // Confirm property-level reassignment
  const confirmPropertyReassign = async () => {
    if (!reassignConfirm || reassignConfirm.type !== 'property') return;

    const { propertyId, affectedRooms } = reassignConfirm;
    const propRoom = propertyRooms.find((pr) => pr.property.id === propertyId);
    if (!propRoom) return;

    for (const affected of affectedRooms || []) {
      const otherAssignment = allAssignments.find(
        (a) =>
          a.property_id === propertyId &&
          a.room_number === affected.room &&
          a.knowledge_base_id !== id
      );
      if (otherAssignment) {
        await removeFromOtherKb(otherAssignment.knowledge_base_id, affected.room);
      }
    }

    const affectedRoomNumbers = new Set((affectedRooms || []).map((a) => a.room));
    setAllAssignments((prev) =>
      prev.filter(
        (a) =>
          !(a.property_id === propertyId &&
            affectedRoomNumbers.has(a.room_number) &&
            a.knowledge_base_id !== id)
      )
    );

    const next = new Set(selectedRooms);
    propRoom.rooms.forEach((r) => next.add(`${propertyId}:${r}`));
    setSelectedRooms(next);
    saveRoomAssignments(next);
    setReassignConfirm(null);
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
      <div className="flex gap-6 h-[calc(100vh-120px)]">
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[500px] w-full" />
        </div>
        <div className="w-80 space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
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
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" render={<Link href="/knowledge-bases" />}>
              <ArrowLeft />
            </Button>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                if (name.trim() !== kb.name) saveName(name);
              }}
              placeholder="Knowledge base name..."
              className="text-lg font-semibold border-none shadow-none px-0 h-auto focus-visible:ring-0 max-w-md"
            />
          </div>
          <div className="flex items-center gap-3">
            <SaveIndicator status={saveStatus} />
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger
                render={<Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" />}
              >
                <Trash2Icon className="h-4 w-4" />
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

        {/* Split screen */}
        <div className="flex gap-6 flex-1 min-h-0">
          {/* Left: Editor */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="rounded-lg border flex flex-col flex-1 overflow-hidden">
              {editor && <EditorToolbar editor={editor} />}
              <div className="flex-1 overflow-y-auto">
                <EditorContent editor={editor} className="w-full h-full" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 shrink-0">
              Auto-saves as you type. Content is stored as Markdown.
            </p>
          </div>

          {/* Right: Property & Room Assignment */}
          <div className="w-80 shrink-0 flex flex-col min-h-0">
            <div className="mb-3 shrink-0">
              <h2 className="text-sm font-semibold tracking-tight">Assign to Properties & Rooms</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalSelectedRooms > 0
                  ? `${totalSelectedRooms} room${totalSelectedRooms === 1 ? '' : 's'} selected`
                  : 'No rooms assigned yet'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {propertyRooms.map(({ property, rooms }) => {
                if (rooms.length === 0) return null;

                const checkState = getPropertyCheckState(property.id, rooms);
                const isExpanded = expandedProperties.has(property.id);
                const selectedCount = rooms.filter((r) => selectedRooms.has(`${property.id}:${r}`)).length;

                return (
                  <div key={property.id} className="rounded-lg border overflow-hidden">
                    {/* Property header */}
                    <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors">
                      <PropertyCheckbox
                        state={checkState}
                        onChange={() => toggleProperty(property.id, rooms)}
                      />
                      <button
                        type="button"
                        onClick={() => togglePropertyExpand(property.id)}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      >
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{property.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">
                          {selectedCount > 0 && `${selectedCount}/`}{rooms.length}
                        </span>
                        <ChevronRight
                          className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Room list (expandable) */}
                    {isExpanded && (
                      <div className="border-t bg-muted/20 px-3 py-2 space-y-1">
                        {rooms.map((room) => {
                          const key = `${property.id}:${room}`;
                          const isSelected = selectedRooms.has(key);
                          const otherKb = getOtherKbAssignment(property.id, room);

                          return (
                            <RoomRow
                              key={key}
                              room={room}
                              isSelected={isSelected}
                              otherKbName={otherKb}
                              onClick={() => toggleRoom(property.id, room)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {propertyRooms.every((pr) => pr.rooms.length === 0) && (
                <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-xs">
                  No rooms found. Rooms are populated from existing knowledge base assignments.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reassignment confirmation dialog */}
        <Dialog
          open={reassignConfirm !== null}
          onOpenChange={(open) => {
            if (!open) setReassignConfirm(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reassign Room{reassignConfirm?.type === 'property' ? 's' : ''}</DialogTitle>
              <DialogDescription>
                {reassignConfirm?.type === 'single' && (
                  <>
                    Room {reassignConfirm.roomNumber} is currently assigned to &quot;{reassignConfirm.otherKbName}&quot;.
                    Reassign to this knowledge base?
                  </>
                )}
                {reassignConfirm?.type === 'property' && (
                  <>
                    Some rooms are assigned to other knowledge bases. Reassign all rooms to this knowledge base?
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {reassignConfirm?.type === 'property' && reassignConfirm.affectedRooms && (
              <div className="max-h-40 overflow-y-auto rounded-md border p-3 space-y-1.5">
                {reassignConfirm.affectedRooms.map((ar) => (
                  <div key={ar.room} className="flex items-center justify-between text-sm">
                    <span className="font-medium">Room {ar.room}</span>
                    <span className="text-muted-foreground text-xs">currently in &quot;{ar.kbName}&quot;</span>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setReassignConfirm(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (reassignConfirm?.type === 'single') {
                    confirmSingleReassign();
                  } else {
                    confirmPropertyReassign();
                  }
                }}
              >
                Reassign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// Editor toolbar component
function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  const toolbarItems = [
    {
      icon: Heading1,
      label: 'Heading 1',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive('heading', { level: 1 }),
    },
    {
      icon: Heading2,
      label: 'Heading 2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive('heading', { level: 2 }),
    },
    {
      icon: Heading3,
      label: 'Heading 3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive('heading', { level: 3 }),
    },
    {
      icon: Bold,
      label: 'Bold',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
    },
    {
      icon: Italic,
      label: 'Italic',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
    },
    {
      icon: List,
      label: 'Bullet List',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
    },
    {
      icon: ListOrdered,
      label: 'Ordered List',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
    },
  ];

  return (
    <div className="flex items-center gap-1 border-b bg-muted/30 px-2 py-1.5 shrink-0">
      {toolbarItems.map((item) => (
        <Tooltip key={item.label}>
          <TooltipTrigger
            render={
              <button
                type="button"
                onClick={item.action}
                className={`
                  inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors
                  ${item.isActive
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }
                `}
              />
            }
          >
            <item.icon className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent>{item.label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
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

// Room row component (replaces badges for a cleaner list in the sidebar)
function RoomRow({
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
  const row = (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex items-center justify-between w-full px-2 py-1.5 rounded-md text-xs transition-colors
        ${isSelected
          ? 'bg-primary/10 text-primary font-medium'
          : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
        }
      `}
    >
      <span className="flex items-center gap-2">
        <span
          className={`h-3 w-3 rounded border flex items-center justify-center shrink-0 ${
            isSelected
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-input'
          }`}
        >
          {isSelected && <Check className="h-2 w-2" />}
        </span>
        Room {room}
      </span>
      {otherKbName && !isSelected && (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
      )}
    </button>
  );

  if (otherKbName && !isSelected) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span className="block" />}>
          {row}
        </TooltipTrigger>
        <TooltipContent side="left">Assigned to: {otherKbName}</TooltipContent>
      </Tooltip>
    );
  }

  return row;
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
        <div className="flex gap-6 h-[calc(100vh-120px)]">
          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[500px] w-full" />
          </div>
          <div className="w-80 space-y-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      }
    >
      <DetailContent />
    </Suspense>
  );
}
