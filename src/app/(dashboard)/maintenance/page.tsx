"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Wrench, Plus, Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase-browser";
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

const statusOptions = ["open", "in_progress", "resolved", "cancelled"];
const urgencyOptions = ["critical", "high", "medium", "low"];

interface Ticket {
  id: string;
  created_at: string | null;
  room_number: string | null;
  urgency: string;
  status: string;
  description: string | null;
  property_id: string | null;
  properties: { name: string } | null;
}

export default function MaintenancePage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [urgencyFilter, setUrgencyFilter] = useState<string[]>([]);

  useEffect(() => {
    async function fetchTickets() {
      const { data } = await supabase
        .from("maintenance_tickets")
        .select("id, created_at, room_number, urgency, status, description, property_id, properties(name)")
        .order("created_at", { ascending: false })
        .limit(100);

      setTickets((data as unknown as Ticket[]) || []);
      setLoading(false);
    }
    fetchTickets();
  }, []);

  function toggleFilter(current: string[], value: string): string[] {
    return current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
  }

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter.length > 0 && !statusFilter.includes(t.status)) return false;
    if (urgencyFilter.length > 0 && !urgencyFilter.includes(t.urgency)) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Maintenance Tickets
        </h1>
        <Link href="/maintenance/new">
          <Button>
            <Plus className="mr-1 size-4" />
            New Ticket
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Status</p>
          <div className="flex flex-wrap gap-1">
            {statusOptions.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(toggleFilter(statusFilter, s))}
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  statusFilter.includes(s)
                    ? statusColors[s]
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Urgency</p>
          <div className="flex flex-wrap gap-1">
            {urgencyOptions.map((u) => (
              <button
                key={u}
                onClick={() => setUrgencyFilter(toggleFilter(urgencyFilter, u))}
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  urgencyFilter.includes(u)
                    ? urgencyColors[u]
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
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
          {filteredTickets.map((ticket) => (
            <TableRow
              key={ticket.id}
              className="cursor-pointer"
              onClick={() => router.push(`/maintenance/detail?id=${ticket.id}`)}
            >
              <TableCell>
                <span className="font-medium text-foreground">
                  {ticket.created_at
                    ? format(new Date(ticket.created_at), "MMM d, yyyy")
                    : "-"}
                </span>
              </TableCell>
              <TableCell>
                {ticket.properties?.name || "-"}
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
          {filteredTickets.length === 0 && (
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
