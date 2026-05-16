"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  description: z.string().min(1, "Description is required"),
  urgency: z.string().min(1, "Urgency is required"),
  status: z.string().min(1, "Status is required"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Ticket {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  property_id: string;
  room_number: string;
  description: string;
  urgency: string;
  status: string;
  notes: string | null;
  properties: { name: string } | null;
}

export default function TicketDetailPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    async function fetchTicket() {
      const { data } = await supabase
        .from("maintenance_tickets")
        .select("*, properties(name)")
        .eq("id", id!)
        .single();

      const t = data as unknown as Ticket | null;
      setTicket(t);
      if (t) {
        reset({
          description: t.description || "",
          urgency: t.urgency || "low",
          status: t.status || "open",
          notes: t.notes || "",
        });
      }
      setLoading(false);
    }
    fetchTicket();
  }, [id, reset]);

  async function onSubmit(data: FormData) {
    if (!id) return;

    const { error } = await supabase
      .from("maintenance_tickets")
      .update({
        description: data.description,
        urgency: data.urgency,
        status: data.status,
        notes: data.notes || null,
      })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Ticket updated");
      // Refresh ticket data
      const { data: updated } = await supabase
        .from("maintenance_tickets")
        .select("*, properties(name)")
        .eq("id", id)
        .single();
      if (updated) {
        setTicket(updated as unknown as Ticket);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!id || !ticket) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/maintenance">
            <Button variant="ghost" size="icon">
              <ArrowLeft />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Ticket Not Found
          </h1>
        </div>
        <p className="text-muted-foreground">
          The requested ticket could not be found.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/maintenance">
          <Button variant="ghost" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Ticket Detail
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Property</Label>
                    <Input
                      value={ticket.properties?.name || "-"}
                      disabled
                      className="disabled:opacity-70"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Room</Label>
                    <Input
                      value={ticket.room_number || "-"}
                      disabled
                      className="disabled:opacity-70"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    className="min-h-[120px]"
                    {...register("description")}
                  />
                  {errors.description && (
                    <p className="text-xs text-destructive">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="urgency">Urgency</Label>
                    <select
                      id="urgency"
                      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      {...register("urgency")}
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    {errors.urgency && (
                      <p className="text-xs text-destructive">
                        {errors.urgency.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      {...register("status")}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    {errors.status && (
                      <p className="text-xs text-destructive">
                        {errors.status.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    className="min-h-[100px]"
                    placeholder="Internal notes..."
                    {...register("notes")}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                <Save className="mr-1 size-4" />
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>

        {/* Audit sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Audit Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p>
                  {ticket.created_at
                    ? format(new Date(ticket.created_at), "MMM d, yyyy HH:mm")
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p>
                  {ticket.updated_at
                    ? format(new Date(ticket.updated_at), "MMM d, yyyy HH:mm")
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ticket ID</p>
                <p className="font-mono text-xs text-muted-foreground break-all">
                  {ticket.id}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
