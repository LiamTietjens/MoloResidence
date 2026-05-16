"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { createRule, updateRule, deleteRule } from "./actions";

interface FormData {
  name: string;
  level: string;
  keywords: string;
  examples: string;
  sort_order: number;
}

interface Rule {
  id: string;
  name: string;
  level: string;
  keywords: string[];
  examples: string[];
  sort_order: number;
}

const levelColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export function UrgencyRulesClient({ rules }: { rules: Rule[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

  function openCreate() {
    setEditingRule(null);
    setDialogOpen(true);
  }

  function openEdit(rule: Rule) {
    setEditingRule(rule);
    setDialogOpen(true);
  }

  async function handleDelete(rule: Rule) {
    if (!confirm(`Delete urgency rule "${rule.name}"?`)) return;
    const result = await deleteRule(rule.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Rule deleted");
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus data-icon="inline-start" />
          Add Rule
        </Button>
      </div>

      <div className="space-y-4">
        {rules.map((rule) => (
          <Card key={rule.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    levelColors[rule.level] || levelColors.low
                  }`}
                >
                  {rule.level}
                </span>
                <CardTitle className="text-base">{rule.name}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  (order: {rule.sort_order})
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openEdit(rule)}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(rule)}
                >
                  <Trash2 />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {rule.examples && rule.examples.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Examples
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {rule.examples.map((ex, i) => (
                      <Badge key={i} variant="secondary">
                        {ex}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {rule.keywords && rule.keywords.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Keywords
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {rule.keywords.map((kw, i) => (
                      <Badge key={i} variant="outline">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {rules.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No urgency rules defined
          </p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit Rule" : "Add Rule"}
            </DialogTitle>
          </DialogHeader>
          <RuleForm
            rule={editingRule}
            onClose={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function RuleForm({
  rule,
  onClose,
}: {
  rule: Rule | null;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: rule
      ? {
          name: rule.name,
          level: rule.level,
          keywords: rule.keywords?.join(", ") || "",
          examples: rule.examples?.join(", ") || "",
          sort_order: rule.sort_order,
        }
      : {
          name: "",
          level: "",
          keywords: "",
          examples: "",
          sort_order: 0,
        },
  });

  async function onSubmit(data: FormData) {
    const payload = {
      name: data.name,
      level: data.level,
      keywords: data.keywords
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      examples: data.examples
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      sort_order: Number(data.sort_order),
    };

    const result = rule
      ? await updateRule(rule.id, payload)
      : await createRule(payload);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(rule ? "Rule updated" : "Rule created");
      onClose();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="rule-name">Name</Label>
        <Input id="rule-name" {...register("name")} />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="rule-level">Level</Label>
        <Input
          id="rule-level"
          placeholder="critical, high, medium, or low"
          {...register("level")}
        />
        {errors.level && (
          <p className="text-xs text-destructive">{errors.level.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="rule-keywords">Keywords (comma-separated)</Label>
        <Input
          id="rule-keywords"
          placeholder="flood, fire, gas leak"
          {...register("keywords")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="rule-examples">Examples (comma-separated)</Label>
        <Input
          id="rule-examples"
          placeholder="Water leaking from ceiling, Smoke in room"
          {...register("examples")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="rule-sort_order">Sort Order</Label>
        <Input
          id="rule-sort_order"
          type="number"
          {...register("sort_order")}
        />
        {errors.sort_order && (
          <p className="text-xs text-destructive">
            {errors.sort_order.message}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : rule ? "Save Changes" : "Create Rule"}
        </Button>
      </DialogFooter>
    </form>
  );
}
