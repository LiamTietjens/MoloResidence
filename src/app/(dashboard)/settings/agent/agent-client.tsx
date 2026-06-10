'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import type { Tables } from '@/backend/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { PhoneInput, isValidE164 } from '@/components/shared/phone-input';
import { updateAgentSettings } from '@/backend/agent-settings';

type AgentSettings = Tables<'agent_settings'>;

const DEFAULT_SYSTEM_PROMPT =
  'You are the voice assistant for the Molo hotel group in Poland. ' +
  'Greet guests warmly, help with reservations, room questions, and maintenance ' +
  'requests, and transfer to a human when you cannot help. Be concise and polite. ' +
  '(to be defined — edit in the dashboard)';

export function AgentSettingsForm({ settings }: { settings: AgentSettings }) {
  const [systemPrompt, setSystemPrompt] = useState(
    settings.system_prompt_main ?? ''
  );
  const [greeting, setGreeting] = useState(settings.greeting_text ?? '');
  const [transferPhone, setTransferPhone] = useState(
    settings.transfer_default_phone ?? ''
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (transferPhone.trim() !== '' && !isValidE164(transferPhone)) {
      toast.error('Transfer phone number is not a valid E.164 number');
      return;
    }

    setSaving(true);
    const res = await updateAgentSettings(settings.id, {
      system_prompt_main: systemPrompt,
      greeting_text: greeting,
      transfer_default_phone:
        transferPhone.trim() === '' ? null : transferPhone.trim(),
    });
    setSaving(false);

    if (!res.ok) {
      toast.error('Failed to save agent settings');
      return;
    }

    toast.success('Agent settings saved');
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>System prompt</CardTitle>
          <CardDescription>
            The main instructions the agent follows on every call.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder={DEFAULT_SYSTEM_PROMPT}
            className="min-h-[480px] font-mono text-sm resize-y"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Changes take effect on the next call.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
            >
              Reset to default
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Greeting</CardTitle>
          <CardDescription>The first line the agent speaks when a call connects.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="greeting">Greeting text</Label>
          <Input
            id="greeting"
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
            placeholder="Hello, thank you for calling Molo. How can I help you?"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default transfer number</CardTitle>
          <CardDescription>
            Where calls are transferred when the agent hands off to a human.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="transfer-phone">Transfer phone</Label>
          <PhoneInput
            id="transfer-phone"
            value={transferPhone}
            onChange={setTransferPhone}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </>
  );
}
