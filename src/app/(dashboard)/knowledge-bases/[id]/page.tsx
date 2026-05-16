import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { KBForm } from "../kb-form";
import {
  updateKnowledgeBase,
  deleteKnowledgeBase,
  duplicateKnowledgeBase,
} from "../actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditKnowledgeBasePage({ params }: PageProps) {
  const { id } = await params;

  const [{ data: kb }, { data: properties }] = await Promise.all([
    supabase
      .from("knowledge_bases")
      .select("*, knowledge_base_rooms(room_number)")
      .eq("id", id)
      .single(),
    supabase.from("properties").select("id, name").order("name"),
  ]);

  if (!kb) {
    notFound();
  }

  const initialData = {
    id: kb.id,
    name: kb.name,
    kind: kb.kind as "general" | "property" | "exception",
    property_id: kb.property_id,
    is_default_general: kb.is_default_general || false,
    content: kb.content || "",
    room_numbers: (kb.knowledge_base_rooms || []).map(
      (r: { room_number: string }) => r.room_number
    ),
  };

  async function handleUpdate(data: Parameters<typeof updateKnowledgeBase>[1]) {
    "use server";
    return updateKnowledgeBase(id, data);
  }

  async function handleDelete() {
    "use server";
    return deleteKnowledgeBase(id);
  }

  async function handleDuplicate() {
    "use server";
    return duplicateKnowledgeBase(id);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Edit: {kb.name}
      </h1>
      <KBForm
        properties={properties || []}
        initialData={initialData}
        onSubmit={handleUpdate}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />
    </div>
  );
}
