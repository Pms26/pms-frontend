import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/forgot-password',
  '/reset-password'
];

const ROLE_RESTRICTIONS: Record<string, string[]> = {
  '/night-audit/history': ['admin', 'manager'],
  '/users': ['admin'],
  '/register': ['admin']
};

const decodeTokenPayload = (token: string) => {
  const payloadPart = token.split('.')[1];

  if (!payloadPart) {
    throw new Error('Token malformé.');
  }

  const base64Payload = payloadPart
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  return JSON.parse(atob(base64Payload));
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);

    return NextResponse.redirect(loginUrl);
  }

  try {
    const payload = decodeTokenPayload(token);

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      const response = NextResponse.redirect(
        new URL('/login', request.url)
      );

      response.cookies.delete('token');

      return response;
    }

    const role = payload.role;

    for (const [restrictedPath, allowedRoles] of Object.entries(
      ROLE_RESTRICTIONS
    )) {
      if (
        pathname.startsWith(restrictedPath) &&
        !allowedRoles.includes(role)
      ) {
        return NextResponse.redirect(
          new URL('/dashboard', request.url)
        );
      }
    }
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url));

    response.cookies.delete('token');

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};