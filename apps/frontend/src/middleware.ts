import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const PROTECTED_PATHS = ["/account", "/orders", "/admin", "/cart", "/checkout"];
const AUTH_PATHS = ["/login", "/register"];
const AUTH_COOKIE = "auth_session";

// Strip the locale prefix (/en, /fr, …) before matching route patterns.
function stripLocale(pathname: string): string {
  return pathname.replace(/^\/[a-z]{2}(\/|$)/, "/").replace(/\/$/, "") || "/";
}

function isProtectedPath(pathname: string): boolean {
  const p = stripLocale(pathname);
  return PROTECTED_PATHS.some((path) => p === path || p.startsWith(path + "/"));
}

function isAuthPath(pathname: string): boolean {
  const p = stripLocale(pathname);
  return AUTH_PATHS.some((path) => p === path || p.startsWith(path + "/"));
}

function getLocaleFromPath(pathname: string): string {
  const match = pathname.match(/^\/([a-z]{2})(\/|$)/);
  return match ? match[1] : routing.defaultLocale;
}

export default function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(AUTH_COOKIE);

  // Auth checks must run before the intl redirect so we can include the correct
  // locale prefix in the redirect target.
  if (isProtectedPath(pathname) && !hasSession) {
    const locale = getLocaleFromPath(pathname);
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPath(pathname) && hasSession) {
    const locale = getLocaleFromPath(pathname);
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  // Delegate everything else (locale detection, prefix redirects, cookie) to
  // next-intl's middleware.
  return intlMiddleware(request);
}

export const config = {
  // Match every pathname except Next.js internals and static files.
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
