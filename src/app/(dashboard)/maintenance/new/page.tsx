import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { NewTicketForm } from "./new-ticket-form";

export default async function NewTicketPage() {
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name")
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/maintenance">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          New Maintenance Ticket
        </h1>
      </div>

      <NewTicketForm properties={properties || []} />
    </div>
  );
}
