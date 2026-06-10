import { createServerClient } from '@/backend/supabase';
import { UrgencyRulesEditor, type UrgencyRule, LEVELS } from './urgency-rules-client';

export const dynamic = 'force-dynamic';

export default async function UrgencyRulesPage() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('urgency_rules')
    .select('*')
    .in('level', ['critical', 'high', 'medium']);

  let allRules = data ?? [];

  // Seed any missing levels so all three cards always render (preserves prior
  // client-side behavior, now done server-side).
  if (!error) {
    const existingLevels = allRules.map((r) => r.level);
    const missing = LEVELS.filter((l) => !existingLevels.includes(l.level));

    if (missing.length > 0) {
      const inserts = missing.map((l) => ({
        level: l.level,
        name: l.label,
        examples: [],
        keywords: [],
        sort_order: LEVELS.findIndex((lv) => lv.level === l.level) + 1,
      }));

      const { data: inserted } = await supabase
        .from('urgency_rules')
        .insert(inserts)
        .select();

      allRules = [...allRules, ...(inserted ?? [])];
    }
  }

  const rulesMap: Record<string, UrgencyRule> = {};
  for (const rule of allRules) {
    rulesMap[rule.level] = {
      id: rule.id,
      level: rule.level,
      name: rule.name,
      examples: Array.isArray(rule.examples) ? (rule.examples as string[]) : [],
      keywords: Array.isArray(rule.keywords) ? (rule.keywords as string[]) : [],
      sort_order: rule.sort_order,
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Urgency Rules</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define examples and descriptions for each urgency level. Changes are saved automatically.
        </p>
      </div>

      <UrgencyRulesEditor rules={rulesMap} />
    </div>
  );
}
