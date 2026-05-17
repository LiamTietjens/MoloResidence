"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase-browser";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface UrgencyRule {
  id: string;
  level: string;
  name: string;
  examples: string[];
  keywords: string[];
  sort_order: number;
}

const LEVELS = [
  { level: "critical", label: "Critical", color: "bg-red-100 text-red-800 border-red-200" },
  { level: "high", label: "High", color: "bg-orange-100 text-orange-800 border-orange-200" },
  { level: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
] as const;

export default function UrgencyRulesPage() {
  const [rules, setRules] = useState<Record<string, UrgencyRule>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    fetchRules();
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);

  async function fetchRules() {
    const { data, error } = await supabase
      .from("urgency_rules")
      .select("*")
      .in("level", ["critical", "high", "medium"]);

    if (error) {
      toast.error("Failed to load urgency rules");
      setLoading(false);
      return;
    }

    const existingLevels = (data || []).map((r: UrgencyRule) => r.level);
    const missing = LEVELS.filter((l) => !existingLevels.includes(l.level));

    let allRules = data || [];

    if (missing.length > 0) {
      const inserts = missing.map((l, i) => ({
        level: l.level,
        name: l.label,
        examples: [],
        keywords: [],
        sort_order: LEVELS.findIndex((lv) => lv.level === l.level) + 1,
      }));

      const { data: inserted, error: insertError } = await supabase
        .from("urgency_rules")
        .insert(inserts)
        .select();

      if (insertError) {
        toast.error("Failed to initialize rules");
      } else {
        allRules = [...allRules, ...(inserted || [])];
      }
    }

    const rulesMap: Record<string, UrgencyRule> = {};
    const textsMap: Record<string, string> = {};

    for (const rule of allRules) {
      rulesMap[rule.level] = rule;
      textsMap[rule.level] = Array.isArray(rule.examples)
        ? rule.examples.join("\n")
        : "";
    }

    setRules(rulesMap);
    setTexts(textsMap);
    setLoading(false);
  }

  const saveRule = useCallback(async (level: string, text: string) => {
    const rule = rules[level];
    if (!rule) return;

    const examples = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const { error } = await supabase
      .from("urgency_rules")
      .update({ examples })
      .eq("id", rule.id);

    if (error) {
      toast.error(`Failed to save ${level} rule`);
    } else {
      setSaved((prev) => ({ ...prev, [level]: true }));
      setTimeout(() => {
        setSaved((prev) => ({ ...prev, [level]: false }));
      }, 2000);
    }
  }, [rules]);

  function handleTextChange(level: string, value: string) {
    setTexts((prev) => ({ ...prev, [level]: value }));
    setSaved((prev) => ({ ...prev, [level]: false }));

    if (debounceTimers.current[level]) {
      clearTimeout(debounceTimers.current[level]);
    }

    debounceTimers.current[level] = setTimeout(() => {
      saveRule(level, value);
    }, 1000);
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Urgency Rules</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define examples and descriptions for each urgency level. Changes are saved automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {LEVELS.map(({ level, label, color }) => (
          <Card key={level} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${color}`}
                >
                  {label}
                </span>
                {saved[level] && (
                  <span className="text-xs text-green-600 font-medium animate-in fade-in">
                    Saved
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <Textarea
                value={texts[level] || ""}
                onChange={(e) => handleTextChange(level, e.target.value)}
                placeholder={`Describe ${label.toLowerCase()} urgency situations, one per line...`}
                className="min-h-[180px] resize-y"
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
