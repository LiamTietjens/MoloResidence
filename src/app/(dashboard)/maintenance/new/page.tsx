"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  property_id: z.string().min(1, "Property is required"),
  room_number: z.string().min(1, "Room number is required"),
  description: z.string().min(1, "Description is required"),
  urgency: z.string().min(1, "Urgency is required"),
});

type FormData = z.infer<typeof schema>;

interface Property {
  id: string;
  name: string;
}

export default function NewTicketPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      property_id: "",
      room_number: "",
      description: "",
      urgency: "medium",
    },
  });

  useEffect(() => {
    async function fetchProperties() {
      const { data } = await supabase
        .from("properties")
        .select("id, name")
        .order("name", { ascending: true });

      setProperties(data || []);
      setLoadingProperties(false);
    }
    fetchProperties();
  }, []);

  async function onSubmit(data: FormData) {
    const { error } = await supabase.from("maintenance_tickets").insert({
      property_id: data.property_id,
      room_number: data.room_number,
      description: data.description,
      urgency: data.urgency,
      status: "open",
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Ticket created");
      router.push("/maintenance");
    }
  }

  if (loadingProperties) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
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
          New Maintenance Ticket
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Ticket Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="property_id">Property</Label>
                <select
                  id="property_id"
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  {...register("property_id")}
                >
                  <option value="">Select property...</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {errors.property_id && (
                  <p className="text-xs text-destructive">
                    {errors.property_id.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="room_number">Room Number</Label>
                <Input
                  id="room_number"
                  placeholder="e.g. 101, 3a"
                  {...register("room_number")}
                />
                {errors.room_number && (
                  <p className="text-xs text-destructive">
                    {errors.room_number.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                className="min-h-[120px]"
                placeholder="Describe the issue..."
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

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
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="mr-1 size-4" />
            {isSubmitting ? "Creating..." : "Create Ticket"}
          </Button>
        </div>
      </form>
    </div>
  );
}
