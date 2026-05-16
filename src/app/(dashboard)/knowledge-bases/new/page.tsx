import { supabase } from "@/lib/supabase";
import { KBForm } from "../kb-form";
import { createKnowledgeBase } from "../actions";

export default async function NewKnowledgeBasePage() {
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name")
    .order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        New Knowledge Base
      </h1>
      <KBForm
        properties={properties || []}
        onSubmit={createKnowledgeBase}
      />
    </div>
  );
}
