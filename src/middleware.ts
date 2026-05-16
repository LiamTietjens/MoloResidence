import { NextResponse, type NextRequest } from 'next/server';
import { unsealData } from 'iron-session';

export async function middleware(req: NextRequest) {
  const sealed = req.cookies.get('molo_session')?.value;
  if (!sealed) return NextResponse.redirect(new URL('/login', req.url));
  try {
    await unsealData(sealed, { password: process.env.SESSION_SECRET! });
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/((?!login|_next/static|_next/image|favicon|api/health).*)'],
};
