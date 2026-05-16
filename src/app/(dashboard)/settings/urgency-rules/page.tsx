"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { supabase } from "@/lib/supabase-browser";
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

interface Rule {
  id: string;
  name: string;
  level: string;
  keywords: string[];
  examples: string[];
  sort_order: number;
}

interface FormData {
  name: string;
  level: string;
  keywords: string;
  examples: string;
  sort_order: number;
}

const levelColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function UrgencyRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

  async function fetchRules() {
    const { data, error } = await supabase
      .from("urgency_rules")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast.error("Failed to load urgency rules");
    } else {
      setRules(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRules();
  }, []);

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

    const { error } = await supabase
      .from("urgency_rules")
      .delete()
      .eq("id", rule.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Rule deleted");
      fetchRules();
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Urgency Rules
        </h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Urgency Rules</h1>
      <p className="text-sm text-muted-foreground">
        Define urgency levels for maintenance tickets. Rules are displayed in
        priority order (lowest sort_order = highest priority).
      </p>

      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
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
                  size="icon"
                  onClick={() => openEdit(rule)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(rule)}
                >
                  <Trash2 className="h-4 w-4" />
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
            onClose={() => {
              setDialogOpen(false);
              fetchRules();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
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

    if (rule) {
      const { error } = await supabase
        .from("urgency_rules")
        .update(payload)
        .eq("id", rule.id);

      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Rule updated");
    } else {
      const { error } = await supabase.from("urgency_rules").insert(payload);

      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Rule created");
    }

    onClose();
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
