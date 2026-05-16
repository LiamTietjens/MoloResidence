"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { Phone, Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase-browser";
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

interface CallLog {
  id: string;
  started_at: string | null;
  duration_seconds: number | null;
  from_number: string | null;
  mode: string | null;
  outcome: string | null;
  cost_usd: number | null;
  property_id: string | null;
  properties: { name: string } | null;
}

export default function CallsPage() {
  const router = useRouter();
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCalls() {
      const { data } = await supabase
        .from("call_logs")
        .select("id, started_at, duration_seconds, from_number, mode, outcome, cost_usd, property_id, properties(name)")
        .order("started_at", { ascending: false })
        .limit(100);

      setCalls((data as unknown as CallLog[]) || []);
      setLoading(false);
    }
    fetchCalls();
  }, []);

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
          {calls.map((call) => (
            <TableRow
              key={call.id}
              className="cursor-pointer"
              onClick={() => router.push(`/calls/detail?id=${call.id}`)}
            >
              <TableCell>
                <span className="font-medium text-foreground">
                  {call.started_at
                    ? format(new Date(call.started_at), "MMM d, yyyy HH:mm")
                    : "-"}
                </span>
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
                {call.properties?.name || "-"}
              </TableCell>
              <TableCell>{outcomeBadge(call.outcome)}</TableCell>
              <TableCell className="text-right font-mono text-xs">
                {call.cost_usd != null
                  ? `$${Number(call.cost_usd).toFixed(4)}`
                  : "-"}
              </TableCell>
            </TableRow>
          ))}
          {calls.length === 0 && (
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
