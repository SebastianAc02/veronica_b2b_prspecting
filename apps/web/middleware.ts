import { NextRequest, NextResponse } from "next/server"

const UNPROTECTED = ["/api/inngest", "/api/health"]

export function middleware(req: NextRequest) {
  if (UNPROTECTED.some((path) => req.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next()
  }

  const authorization = req.headers.get("authorization")
  if (authorization) {
    const [scheme, encoded] = authorization.split(" ")
    if (scheme === "Basic" && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf-8")
      const [, password] = decoded.split(":")
      if (password === process.env.BASIC_AUTH_PASSWORD) {
        return NextResponse.next()
      }
    }
  }

  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Veronica"' },
  })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
