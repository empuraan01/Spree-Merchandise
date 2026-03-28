import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Protect /distribute and /stats — redirect to login if no session
  if ((pathname.startsWith("/distribute") || pathname.startsWith("/stats")) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // If logged in and on login page, redirect to /distribute
  if (pathname === "/" && isLoggedIn) {
    return NextResponse.redirect(new URL("/distribute", req.url));
  }
});

export const config = {
  matcher: ["/", "/distribute/:path*", "/stats/:path*"],
};
