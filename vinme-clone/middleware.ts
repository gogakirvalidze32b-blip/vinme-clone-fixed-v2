import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const isLoggedIn =
    req.cookies.get("sb-access-token") ||
    req.cookies.get("sb-refresh-token");

  if (!isLoggedIn && req.nextUrl.pathname.startsWith("/feed")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}