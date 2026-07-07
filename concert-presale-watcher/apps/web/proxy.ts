import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env, isAuthEnabled } from "./lib/env";
import { isPollRequestAuthorized } from "./lib/pollAuth";

const publicPaths = new Set([
  "/",
  "/auth/callback",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/terms",
  "/api/health",
  "/api/notification-settings/confirm-email",
]);

const isStaticAsset = (pathname: string): boolean => {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/vercel.svg") ||
    pathname.startsWith("/next.svg") ||
    pathname.startsWith("/window.svg") ||
    pathname.startsWith("/globe.svg") ||
    pathname.startsWith("/file-text.svg") ||
    pathname.startsWith("/turborepo-")
  );
};

const attachAuthCookies = (
  source: NextResponse,
  target: NextResponse,
): NextResponse => {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value, cookie);
  });

  source.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey !== "set-cookie" &&
      normalizedKey !== "x-middleware-next"
    ) {
      target.headers.set(key, value);
    }
  });

  return target;
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = publicPaths.has(pathname);

  if (
    (pathname === "/api/cron/poll" || pathname === "/api/internal/dispatch") &&
    isPollRequestAuthorized(request)
  ) {
    return NextResponse.next();
  }

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  if (!isAuthEnabled()) {
    if (isPublicPath) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    env.supabaseUrl as string,
    env.supabaseAnonKey as string,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });

          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    (pathname === "/" || pathname === "/login" || pathname === "/signup") &&
    user
  ) {
    return attachAuthCookies(
      response,
      NextResponse.redirect(new URL("/dashboard", request.url)),
    );
  }

  if (isPublicPath) {
    return response;
  }

  if (user) {
    return response;
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return attachAuthCookies(response, NextResponse.redirect(loginUrl));
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
