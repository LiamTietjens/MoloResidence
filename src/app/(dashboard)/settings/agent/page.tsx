import { createServerClient } from '@/backend/supabase';
import { AgentSettingsForm } from './agent-client';

export const dynamic = 'force-dynamic';

export default async function AgentSettingsPage() {
  const supabase = createServerClient();

  const { data } = await supabase
    .from('agent_settings')
    .select('*')
    .limit(1)
    .single();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agent</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure the voice agent&apos;s system prompt, greeting, and default transfer number.
        </p>
      </div>

      {data ? (
        <AgentSettingsForm settings={data} />
      ) : (
        <p className="py-12 text-center text-muted-foreground">
          Failed to load agent settings.
        </p>
      )}
    </div>
  );
}
