import Link from "next/link";
import { format } from "date-fns";
import { Wrench, Plus } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const urgencyColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default async function MaintenancePage() {
  const { data: tickets } = await supabase
    .from("maintenance_tickets")
    .select("id, created_at, room_number, urgency, status, description, property_id, properties(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Maintenance Tickets
        </h1>
        <Link href="/maintenance/new">
          <Button>
            <Plus data-icon="inline-start" />
            New Ticket
          </Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Property</TableHead>
            <TableHead>Room</TableHead>
            <TableHead>Urgency</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="max-w-[300px]">Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets?.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell>
                <Link
                  href={`/maintenance/${ticket.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {ticket.created_at
                    ? format(new Date(ticket.created_at), "MMM d, yyyy")
                    : "-"}
                </Link>
              </TableCell>
              <TableCell>
                {(ticket.properties as unknown as { name: string } | null)?.name || "-"}
              </TableCell>
              <TableCell className="font-mono">
                {ticket.room_number || "-"}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    urgencyColors[ticket.urgency] || urgencyColors.low
                  }`}
                >
                  {ticket.urgency}
                </span>
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    statusColors[ticket.status] || statusColors.open
                  }`}
                >
                  {ticket.status?.replace("_", " ")}
                </span>
              </TableCell>
              <TableCell className="max-w-[300px] truncate">
                {ticket.description || "-"}
              </TableCell>
            </TableRow>
          ))}
          {(!tickets || tickets.length === 0) && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center text-muted-foreground"
              >
                <div className="flex flex-col items-center gap-2 py-8">
                  <Wrench className="size-8 text-muted-foreground/50" />
                  <p>No maintenance tickets</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
