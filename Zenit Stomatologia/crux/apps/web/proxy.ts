import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PREFIXES = ["/logowanie", "/zablokowany"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function securityHeaders(response: NextResponse, nonce: string): NextResponse {
  const scriptSrc =
    process.env["NODE_ENV"] === "production"
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`;
  const csp = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' http://127.0.0.1:54321 http://localhost:54321 https://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env["NODE_ENV"] === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  response.headers.set("x-request-id", crypto.randomUUID());
  return response;
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  let response = NextResponse.next({
    request: {
      headers: (() => {
        const h = new Headers(request.headers);
        h.set("x-nonce", nonce);
        return h;
      })(),
    },
  });
  response = securityHeaders(response, nonce);

  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        response = securityHeaders(response, nonce);
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const locked = request.cookies.get("crux.lock")?.value === "1";

  if (!data.user && !isPublic(pathname) && pathname !== "/") {
    const login = new URL("/logowanie", request.url);
    return securityHeaders(NextResponse.redirect(login), nonce);
  }

  if (data.user && locked && pathname !== "/zablokowany" && !pathname.startsWith("/logowanie")) {
    return securityHeaders(NextResponse.redirect(new URL("/zablokowany", request.url)), nonce);
  }

  if (data.user && (pathname === "/logowanie" || pathname === "/")) {
    if (locked) {
      return securityHeaders(NextResponse.redirect(new URL("/zablokowany", request.url)), nonce);
    }
    return securityHeaders(NextResponse.redirect(new URL("/oblozenie", request.url)), nonce);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|icons/|.*\\.(?:svg|png|ico)$).*)"],
};
