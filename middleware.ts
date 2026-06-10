import { NextResponse, type NextRequest } from 'next/server';

// Gate every route behind the session cookie. In demo mode the login itself
// accepts any credentials (see src/lib/auth-actions.ts), but the flow still runs.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get('molo_session')?.value);

  if (pathname === '/login') {
    if (hasSession) return NextResponse.redirect(new URL('/', request.url));
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|api/health|favicon.ico|logo.png|icon.svg|.*\\..*).*)'],
};
