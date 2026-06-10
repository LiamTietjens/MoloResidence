import { sealData, unsealData } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  userId: string;
  displayName: string | null;
}

const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET!,
  ttl: 60 * 60 * 24 * 30, // 30 days
};

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sealed = cookieStore.get('molo_session')?.value;
  if (!sealed) return null;
  try {
    return await unsealData<SessionData>(sealed, SESSION_OPTIONS);
  } catch {
    return null;
  }
}

export async function createSession(data: SessionData) {
  const sealed = await sealData(data, SESSION_OPTIONS);
  const cookieStore = await cookies();
  cookieStore.set('molo_session', sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete('molo_session');
}
