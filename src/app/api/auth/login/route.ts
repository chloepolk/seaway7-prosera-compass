import { NextResponse } from "next/server"
import {
  PROTOTYPE_ACCESS_COOKIE,
  accessCookieOptions,
  getAccessSecret,
  signAccessCookie,
  verifyAccessPassword,
} from "@/lib/prototype-access"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const secret = getAccessSecret()
  if (!secret) {
    return NextResponse.json({ ok: false }, { status: 503 })
  }

  let password = ""
  try {
    const body = await req.json()
    password = typeof body?.password === "string" ? body.password : ""
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  if (!(await verifyAccessPassword(secret, password))) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const token = await signAccessCookie(secret)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(PROTOTYPE_ACCESS_COOKIE, token, accessCookieOptions())
  return res
}
