import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { Phone } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function modeBadge(mode: string | null) {
  if (!mode) return null;
  const variant = mode === "inbound" ? "default" : "secondary";
  return <Badge variant={variant}>{mode}</Badge>;
}

function outcomeBadge(outcome: string | null) {
  if (!outcome) return null;
  const colors: Record<string, string> = {
    resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    transferred: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    dropped: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    voicemail: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        colors[outcome] || "bg-gray-100 text-gray-800"
      }`}
    >
      {outcome}
    </span>
  );
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default async function CallsPage() {
  const { data: calls } = await supabase
    .from("call_logs")
    .select("id, started_at, duration_seconds, from_number, mode, outcome, cost_usd, property_id, properties(name)")
    .order("started_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Call Logs</h1>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>From</TableHead>
            <TableHead>Mode</TableHead>
            <TableHead>Property</TableHead>
            <TableHead>Outcome</TableHead>
            <TableHead className="text-right">Cost (USD)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calls?.map((call) => (
            <TableRow key={call.id}>
              <TableCell>
                <Link
                  href={`/calls/${call.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {call.started_at
                    ? format(new Date(call.started_at), "MMM d, yyyy HH:mm")
                    : "-"}
                </Link>
                {call.started_at && (
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(call.started_at), {
                      addSuffix: true,
                    })}
                  </p>
                )}
              </TableCell>
              <TableCell>{formatDuration(call.duration_seconds)}</TableCell>
              <TableCell className="font-mono text-xs">
                {call.from_number || "-"}
              </TableCell>
              <TableCell>{modeBadge(call.mode)}</TableCell>
              <TableCell>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(call as any).properties?.name || "-"}
              </TableCell>
              <TableCell>{outcomeBadge(call.outcome)}</TableCell>
              <TableCell className="text-right font-mono text-xs">
                {call.cost_usd != null
                  ? `$${Number(call.cost_usd).toFixed(4)}`
                  : "-"}
              </TableCell>
            </TableRow>
          ))}
          {(!calls || calls.length === 0) && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center text-muted-foreground"
              >
                <div className="flex flex-col items-center gap-2 py-8">
                  <Phone className="size-8 text-muted-foreground/50" />
                  <p>No calls recorded yet</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
