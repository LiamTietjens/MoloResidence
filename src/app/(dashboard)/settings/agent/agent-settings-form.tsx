"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { updateAgentSettings } from "./actions";

const schema = z.object({
  system_prompt_main: z.string().min(1, "System prompt is required"),
  greeting_text: z.string().min(1, "Greeting text is required"),
  transfer_default_phone: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, "Must be a valid E.164 phone number (e.g. +48123456789)"),
});

type FormData = z.infer<typeof schema>;

export function AgentSettingsForm({
  initialData,
}: {
  initialData: FormData;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData,
  });

  async function onSubmit(data: FormData) {
    const result = await updateAgentSettings(data);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Agent settings saved");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="system_prompt_main">
            Main system prompt for the voice agent
          </Label>
          <Textarea
            id="system_prompt_main"
            className="min-h-[600px] font-mono text-sm"
            {...register("system_prompt_main")}
          />
          {errors.system_prompt_main && (
            <p className="text-xs text-destructive">
              {errors.system_prompt_main.message}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Greeting &amp; Transfer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="greeting_text">Greeting Text</Label>
            <Input
              id="greeting_text"
              placeholder="Hello, thank you for calling Molo Residence..."
              {...register("greeting_text")}
            />
            {errors.greeting_text && (
              <p className="text-xs text-destructive">
                {errors.greeting_text.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="transfer_default_phone">
              Transfer Default Phone (E.164)
            </Label>
            <Input
              id="transfer_default_phone"
              placeholder="+48123456789"
              {...register("transfer_default_phone")}
            />
            {errors.transfer_default_phone && (
              <p className="text-xs text-destructive">
                {errors.transfer_default_phone.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          <Save data-icon="inline-start" />
          {isSubmitting ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </form>
  );
}
