import { verifySessionToken } from "@/lib/auth-crypto";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = new Set(["/", "/login", "/signup"]);

function parseSession(raw: string | undefined) {
  if (!raw) return null;
  return verifySessionToken<{ guest?: boolean; email?: string; role?: string }>(raw);
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const isAdminHost = host.startsWith("admin.") || host.startsWith("admin:");
  const realPathname = request.nextUrl.pathname;

  // Serve the admin backend from the `admin.` subdomain while keeping it in the
  // same deployment — admin.<domain>/foo is treated as /admin/foo internally.
  const isAsset = realPathname.startsWith("/_next") || realPathname.startsWith("/api") || realPathname.includes(".");
  const effectivePathname =
    isAdminHost && !isAsset && !realPathname.startsWith("/admin")
      ? `/admin${realPathname === "/" ? "" : realPathname}`
      : realPathname;
  const needsRewrite = effectivePathname !== realPathname;

  if (isAsset) {
    if (needsRewrite) {
      const url = request.nextUrl.clone();
      url.pathname = effectivePathname;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  if (effectivePathname.startsWith("/admin")) {
    if (effectivePathname === "/admin/login") {
      if (needsRewrite) {
        const url = request.nextUrl.clone();
        url.pathname = effectivePathname;
        return NextResponse.rewrite(url);
      }
      return NextResponse.next();
    }
    const session = parseSession(request.cookies.get("mi_session")?.value);
    if (!session || session.guest || session.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    if (needsRewrite) {
      const url = request.nextUrl.clone();
      url.pathname = effectivePathname;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  const sessionRaw = request.cookies.get("mi_session")?.value;
  const session = parseSession(sessionRaw);
  const isPublic = PUBLIC.has(realPathname);

  if (!sessionRaw && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", realPathname);
    return NextResponse.redirect(url);
  }

  if (sessionRaw && (realPathname === "/login" || realPathname === "/signup")) {
    const isGuest = session?.guest === true;
    if (!isGuest) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
