import { NextRequest, NextResponse } from "next/server"

const COOKIE_NAME = "veronica_auth"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!password || password !== process.env.BASIC_AUTH_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  })
  return res
}
