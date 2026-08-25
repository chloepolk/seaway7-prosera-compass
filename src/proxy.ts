import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  PROTOTYPE_ACCESS_COOKIE,
  getAccessSecret,
  verifyAccessCookie,
} from "@/lib/prototype-access"

const ALLOWED_PROTOTYPE_PATHS = new Set<string>([
  "/prototype",
  "/prototype/prosera-compass",
  "/prototype/future-energy",
])

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login" || pathname.startsWith("/login/")) return true
  if (pathname === "/api/health") return true
  if (pathname === "/api/auth/login") return true
  return false
}

function deny(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const login = request.nextUrl.clone()
  login.pathname = "/login"
  login.search = ""
  return NextResponse.redirect(login)
}

/**
 * Next.js 16 request proxy (replaces middleware.ts).
 * - Restricts /prototype/* to known apps
 * - Optional shared-secret gate via PROTOTYPE_ACCESS_SECRET
 *   (when unset, local/demo access stays open)
 */
export async function proxy(request: NextRequest) {
  const url = request.nextUrl
  const { pathname } = url

  if (pathname.startsWith("/prototype/")) {
    if (!ALLOWED_PROTOTYPE_PATHS.has(pathname)) {
      const notFound = url.clone()
      notFound.pathname = "/_not-found"
      return NextResponse.rewrite(notFound)
    }
  }

  if (isPublicPath(pathname)) return NextResponse.next()

  const secret = getAccessSecret()
  // No secret configured → open for local demos. Set PROTOTYPE_ACCESS_SECRET to gate.
  if (!secret) return NextResponse.next()

  const token = request.cookies.get(PROTOTYPE_ACCESS_COOKIE)?.value
  if (await verifyAccessCookie(secret, token)) {
    return NextResponse.next()
  }

  return deny(request)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
