'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { saveUrgencyExamples } from '@/backend/urgency-rules';

export interface UrgencyRule {
  id: string;
  level: string;
  name: string;
  examples: string[];
  keywords: string[];
  sort_order: number;
}

export const LEVELS = [
  { level: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800 border-red-200' },
  { level: 'high', label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { level: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
] as const;

export function UrgencyRulesEditor({
  rules,
}: {
  rules: Record<string, UrgencyRule>;
}) {
  const [texts, setTexts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const [level, rule] of Object.entries(rules)) {
      initial[level] = rule.examples.join('\n');
    }
    return initial;
  });
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const saveRule = useCallback(
    async (level: string, text: string) => {
      const rule = rules[level];
      if (!rule) return;

      const examples = text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const res = await saveUrgencyExamples(rule.id, examples);

      if (!res.ok) {
        toast.error(`Failed to save ${level} rule`);
      } else {
        setSaved((prev) => ({ ...prev, [level]: true }));
        setTimeout(() => {
          setSaved((prev) => ({ ...prev, [level]: false }));
        }, 2000);
      }
    },
    [rules]
  );

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

  return (
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
              value={texts[level] || ''}
              onChange={(e) => handleTextChange(level, e.target.value)}
              placeholder={`Describe ${label.toLowerCase()} urgency situations, one per line...`}
              className="min-h-[180px] resize-y"
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
