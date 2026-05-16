import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { TicketDetailForm } from "./ticket-detail-form";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: ticket } = await supabase
    .from("maintenance_tickets")
    .select("*, properties(name)")
    .eq("id", id)
    .single();

  if (!ticket) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/maintenance">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Ticket Detail
        </h1>
      </div>

      <TicketDetailForm ticket={ticket} />
    </div>
  );
}
