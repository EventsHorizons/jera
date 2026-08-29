import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/verify-email",
];

/** Allowed even with an active session (password recovery exchange). */
const SESSION_ALLOWED_AUTH_ROUTES = ["/reset-password"];

const PUBLIC_ROUTES = [
  "/",
  "/auth/callback",
  "/auth/confirm",
  ...AUTH_ROUTES,
  ...SESSION_ALLOWED_AUTH_ROUTES,
];

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/onboarding",
  "/settings",
  "/accounts",
  "/transactions",
  "/recurring",
  "/budgets",
  "/goals",
  "/debts",
  "/plan",
];

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.includes(pathname);
}

export async function middleware(request: NextRequest) {
  const session = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (session.configMissing) {
    if (pathname === "/" || pathname.startsWith("/auth/")) {
      return session.supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("error", "config");
    return NextResponse.redirect(url);
  }

  const { supabaseResponse, user } = session;

  if (pathname.startsWith("/auth/")) {
    return supabaseResponse;
  }

  // Recovery / post-auth password set must work while a temporary session exists.
  if (SESSION_ALLOWED_AUTH_ROUTES.includes(pathname)) {
    return supabaseResponse;
  }

  if (user && isAuthRoute(pathname)) {
    const url = request.nextUrl.clone();
    // Don't force dashboard — let app layouts decide onboarding vs home.
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!user && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (PUBLIC_ROUTES.includes(pathname) || (isProtected(pathname) && user)) {
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
