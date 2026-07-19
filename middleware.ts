// ═══════════════════════════════════════════════════════════
// OASIS PMS — Next.js Middleware (Route Protection)
// Vérifie la présence du cookie 'token' avant d'accéder
// à toute route protégée. Redirige vers /login si absent.
// ═══════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes publiques (pas de token requis)
const PUBLIC_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Laisser passer les routes publiques
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Vérifier le token dans les cookies
  const token = request.cookies.get('token')?.value;
  if (!token) {
    // Pas de token → rediriger vers login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─── Contrôle d'accès par rôle (optionnel) ─────────────
  // Décoder le payload JWT pour vérifier le rôle
  // Note: ce n'est PAS une vérification de signature (côté client),
  // le backend doit toujours re-vérifier le token.
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const role = payload.role;

    // Routes restreintes par rôle
    const ROLE_RESTRICTIONS: Record<string, string[]> = {
      '/night-audit/history': ['admin', 'auditor', 'manager'],
    };

    for (const [restrictedPath, allowedRoles] of Object.entries(ROLE_RESTRICTIONS)) {
      if (pathname.startsWith(restrictedPath) && !allowedRoles.includes(role)) {
        // Pas autorisé → rediriger vers dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  } catch {
    // Token malformé → rediriger vers login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }

  return NextResponse.next();
}

// ─── Matcher: routes sur lesquelles le middleware s'applique
export const config = {
  matcher: [
    /*
     * Appliquer à toutes les routes SAUF :
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation images)
     * - favicon.ico
     * - fichiers publics (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
