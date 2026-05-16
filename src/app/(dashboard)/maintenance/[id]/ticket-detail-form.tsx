"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { updateTicket } from "../actions";

const schema = z.object({
  description: z.string().min(1, "Description is required"),
  urgency: z.string().min(1, "Urgency is required"),
  status: z.string().min(1, "Status is required"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Ticket {
  id: string;
  created_at: string;
  updated_at: string | null;
  property_id: string;
  room_number: string;
  description: string;
  urgency: string;
  status: string;
  notes: string | null;
  properties: { name: string } | null;
}

export function TicketDetailForm({ ticket }: { ticket: Ticket }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: ticket.description || "",
      urgency: ticket.urgency || "low",
      status: ticket.status || "open",
      notes: ticket.notes || "",
    },
  });

  async function onSubmit(data: FormData) {
    const result = await updateTicket(ticket.id, data);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Ticket updated");
    }
  }

  return (
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
              <Save data-icon="inline-start" />
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
  );
}
