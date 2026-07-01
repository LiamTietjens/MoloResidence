'use client';

// Public, token-authenticated same-night booking page. Reached via the SMS link
// the voice agent sends: /book?token=... — NO login required (excluded from the
// auth redirect in auth-context.tsx). Static-export safe: the token is read from
// the query string client-side (no dynamic route, no server).
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RoomOption {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
}

interface BookingSession {
  status: string;
  check_in: string;
  check_out: string;
  num_adults: number;
  num_children: number;
  options: RoomOption[];
}

type ViewState = 'loading' | 'ready' | 'error' | 'done';

function fmtDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'short', day: 'numeric', month: 'long',
    });
  } catch {
    return iso;
  }
}

export default function BookPage() {
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<BookingSession | null>(null);
  const [view, setView] = useState<ViewState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [selected, setSelected] = useState<RoomOption | null>(null);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token');
    setToken(t);
    if (!t) {
      setView('error');
      setErrorMsg('This booking link is invalid.');
      return;
    }
    apiFetch<BookingSession>(`/public/booking/${t}`)
      .then((s) => {
        if (s.status === 'booked') {
          setView('done');
          return;
        }
        setSession(s);
        setView('ready');
      })
      .catch((e: unknown) => {
        setView('error');
        const msg = String((e as Error)?.message ?? '');
        setErrorMsg(
          msg.includes('expired')
            ? 'This booking link has expired. Please call us again.'
            : 'This booking link is no longer valid. Please call us again.',
        );
      });
  }, []);

  async function confirm() {
    if (!token || !selected || !email.trim()) return;
    setSubmitting(true);
    try {
      await apiFetch(`/public/booking/${token}/select`, {
        method: 'POST',
        body: JSON.stringify({ room_id: selected.id, email: email.trim() }),
      });
      setView('done');
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-muted/30 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-lg">
        <h1 className="text-center text-2xl font-semibold mb-1">Molo Residence</h1>
        <p className="text-center text-sm text-muted-foreground mb-6">Book your room for tonight</p>

        {view === 'loading' && (
          <p className="text-center text-muted-foreground py-16">Loading your options…</p>
        )}

        {view === 'error' && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">{errorMsg}</CardContent>
          </Card>
        )}

        {view === 'done' && (
          <Card>
            <CardContent className="py-12 text-center space-y-2">
              <p className="text-lg font-medium">You&apos;re all set! 🎉</p>
              <p className="text-muted-foreground">
                You&apos;ll receive an SMS with your check-in instructions shortly.
              </p>
            </CardContent>
          </Card>
        )}

        {view === 'ready' && session && (
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              {fmtDate(session.check_in)} → {fmtDate(session.check_out)} ·{' '}
              {session.num_adults} adult{session.num_adults === 1 ? '' : 's'}
              {session.num_children > 0 ? `, ${session.num_children} child${session.num_children === 1 ? '' : 'ren'}` : ''}
            </p>

            {session.options.map((opt) => {
              const isSel = selected?.id === opt.id;
              return (
                <Card
                  key={opt.id}
                  className={`cursor-pointer transition ${isSel ? 'ring-2 ring-primary' : 'hover:bg-accent/40'}`}
                  onClick={() => setSelected(opt)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-base">{opt.name}</CardTitle>
                        <CardDescription>{opt.description}</CardDescription>
                      </div>
                      <div className="text-right whitespace-nowrap font-semibold">
                        {opt.price} {opt.currency}
                        <div className="text-xs font-normal text-muted-foreground">per night</div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Your email (for the confirmation)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
                <Button
                  className="w-full"
                  disabled={!selected || !email.trim() || submitting}
                  onClick={confirm}
                >
                  {submitting ? 'Booking…' : selected ? `Book ${selected.name}` : 'Select a room'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
