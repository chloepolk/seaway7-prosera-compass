import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const ALLOWED = new Set<string>([
  "/prototype",
  "/prototype/prosera-compass",
])

export function proxy(req: NextRequest) {
  const url = req.nextUrl
  const { pathname } = url

  if (pathname.startsWith("/prototype/")) {
    if (!ALLOWED.has(pathname)) {
      const notFound = url.clone()
      notFound.pathname = "/_not-found"
      return NextResponse.rewrite(notFound)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/prototype/:path*"],
}

