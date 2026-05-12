import { NextRequest, NextResponse } from "next/server"

const COOKIE_NAME = "veronica_auth"
const API_UNPROTECTED = ["/api/inngest", "/api/health", "/api/auth/login"]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const authCookie = req.cookies.get(COOKIE_NAME)
  const isAuthenticated = authCookie?.value === process.env.BASIC_AUTH_PASSWORD

  if (API_UNPROTECTED.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (pathname === "/login") {
    if (isAuthenticated) return NextResponse.redirect(new URL("/", req.url))
    return NextResponse.next()
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
