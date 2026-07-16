import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function contentSecurityPolicy(nonce: string): string {
  const scriptSource = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    process.env.NODE_ENV === "development" ? "'unsafe-eval'" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSource}`,
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    process.env.NODE_ENV === "production" ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function allowedAdminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const isAdminPath = request.nextUrl.pathname.startsWith("/admin");
  const isLoginPath = request.nextUrl.pathname === "/admin/login";
  const isIntakePath = request.nextUrl.pathname.startsWith("/intake/");

  const applySensitiveRouteHeaders = (target: NextResponse) => {
    target.headers.set("Content-Security-Policy", csp);
    if (isAdminPath || isIntakePath) {
      target.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    }
    if (isIntakePath) {
      target.headers.set("Cache-Control", "private, no-store, max-age=0");
    }
  };

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  applySensitiveRouteHeaders(response);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return response;
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet)
          request.cookies.set(name, value);
        response = NextResponse.next({ request: { headers: requestHeaders } });
        applySensitiveRouteHeaders(response);
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const allowed = user?.email
    ? allowedAdminEmails().has(user.email.trim().toLowerCase())
    : false;

  if (isAdminPath && !isLoginPath && (!user || !allowed)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (isLoginPath && user && allowed) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
