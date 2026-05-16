import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: call } = await supabase
    .from("call_logs")
    .select("*, properties(name)")
    .eq("id", id)
    .single();

  if (!call) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/calls">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Call Detail</h1>
      </div>

      {/* Metadata block */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Date</p>
              <p className="text-sm font-medium">
                {call.started_at
                  ? format(new Date(call.started_at), "MMM d, yyyy HH:mm:ss")
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Duration
              </p>
              <p className="text-sm font-medium">
                {call.duration_seconds
                  ? `${Math.floor(call.duration_seconds / 60)}:${String(
                      call.duration_seconds % 60
                    ).padStart(2, "0")}`
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">From</p>
              <p className="text-sm font-mono">{call.from_number || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Mode</p>
              <Badge variant={call.mode === "inbound" ? "default" : "secondary"}>
                {call.mode || "-"}
              </Badge>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Property
              </p>
              <p className="text-sm">
                {(call.properties as { name: string } | null)?.name || "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Outcome
              </p>
              <p className="text-sm capitalize">{call.outcome || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Cost</p>
              <p className="text-sm font-mono">
                {call.cost_usd != null
                  ? `$${Number(call.cost_usd).toFixed(4)}`
                  : "-"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Call ID
              </p>
              <p className="text-xs font-mono text-muted-foreground">
                {call.id}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="recording">Recording</TabsTrigger>
          <TabsTrigger value="tool-calls">Tool Calls</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {call.summary ? (
                <p className="text-sm whitespace-pre-wrap">{call.summary}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No summary available for this call.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transcript">
          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              {call.transcript_url ? (
                <a
                  href={call.transcript_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="size-4" />
                  View Transcript
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No transcript available for this call.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recording">
          <Card>
            <CardHeader>
              <CardTitle>Recording</CardTitle>
            </CardHeader>
            <CardContent>
              {call.recording_url ? (
                <audio controls className="w-full max-w-lg">
                  <source src={call.recording_url} />
                  Your browser does not support the audio element.
                </audio>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recording available for this call.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tool-calls">
          <Card>
            <CardHeader>
              <CardTitle>Tool Calls</CardTitle>
            </CardHeader>
            <CardContent>
              {call.tool_calls ? (
                <pre className="overflow-auto rounded-md bg-muted p-4 text-xs font-mono">
                  {JSON.stringify(call.tool_calls, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No tool calls recorded for this call.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
