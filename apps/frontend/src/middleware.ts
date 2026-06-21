import createMiddleware from "next-intl/middleware";
import { NextResponse, NextRequest } from "next/server";
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

  // When the user has a session, forward an auth hint to Server Components
  // via a request header so the layout can initialize the auth UI correctly
  // on the server render — eliminating the SSR→hydration flash.
  if (hasSession) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-auth-hint", "1");

    // Pass the modified request to intlMiddleware; its internal next() call
    // forwards these headers to the Server Component tree.
    const intlResponse = intlMiddleware(
      new NextRequest(request.url, {
        headers: requestHeaders,
        method: request.method,
        body: request.body,
        signal: request.signal,
      }),
    );

    // If intlMiddleware issued a locale redirect, return it directly.
    if (intlResponse.status >= 300) return intlResponse;

    // For pass-through responses, re-issue next() ourselves so the request
    // headers (including x-auth-hint) are properly forwarded to Server Components,
    // and copy any cookies intlMiddleware set (e.g. NEXT_LOCALE).
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    intlResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie);
    });
    return response;
  }

  // No session — delegate to intlMiddleware as normal.
  return intlMiddleware(request);
}

export const config = {
  // Match every pathname except Next.js internals and static files.
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
