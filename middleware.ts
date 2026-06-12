import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Edge instance — reads the JWT only (no Prisma/bcrypt).
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;
  const loggedIn = !!req.auth;
  const isStaff = role === "ADMIN" || role === "STAFF";

  // public auth pages
  if (pathname === "/login" || pathname === "/admin/login") return;

  // admin panel — staff only
  if (pathname.startsWith("/admin")) {
    if (!isStaff) {
      return NextResponse.redirect(new URL("/admin/login", req.nextUrl));
    }
    return;
  }

  // dealer portal — dealers (or staff)
  if (pathname.startsWith("/dealer")) {
    if (!loggedIn) return NextResponse.redirect(new URL("/login", req.nextUrl));
    if (role !== "DEALER" && !isStaff) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
    return;
  }

  // customer-gated areas
  if (!loggedIn) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/dealer/:path*",
    "/checkout/:path*",
    "/order-confirmation/:path*",
    "/account/:path*",
    "/orders/:path*",
    "/returns/:path*",
    "/wishlist/:path*",
    "/rewards/:path*",
    "/notifications/:path*",
    "/profile/:path*",
  ],
};
