import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = new Set(["/", "/login", "/signup"]);

function parseSession(raw: string | undefined) {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { guest?: boolean; email?: string };
  } catch {
    return { email: raw };
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const sessionRaw = request.cookies.get("mi_session")?.value;
  const session = parseSession(sessionRaw);
  const isPublic = PUBLIC.has(pathname);

  if (!sessionRaw && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (sessionRaw && (pathname === "/login" || pathname === "/signup")) {
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
