/** Shared-secret cookie helpers. Edge-safe (Web Crypto only). */

export const PROTOTYPE_ACCESS_COOKIE = "prototype_access"

const COOKIE_PAYLOAD = "v1"

export function getAccessSecret(): string | null {
  const secret = process.env.PROTOTYPE_ACCESS_SECRET
  return secret && secret.length > 0 ? secret : null
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
  return Array.from(new Uint8Array(sig), b => b.toString(16).padStart(2, "0")).join("")
}

function timingSafeEqualString(a: string, b: string): boolean {
  const encoder = new TextEncoder()
  const left = encoder.encode(a)
  const right = encoder.encode(b)
  if (left.byteLength !== right.byteLength) return false
  let diff = 0
  for (let i = 0; i < left.byteLength; i++) diff |= left[i] ^ right[i]
  return diff === 0
}

export async function signAccessCookie(secret: string): Promise<string> {
  return hmacHex(secret, COOKIE_PAYLOAD)
}

export async function verifyAccessCookie(secret: string, value: string | undefined): Promise<boolean> {
  if (!value) return false
  const expected = await hmacHex(secret, COOKIE_PAYLOAD)
  return timingSafeEqualString(value, expected)
}

export async function verifyAccessPassword(secret: string, password: string): Promise<boolean> {
  const submitted = await hmacHex(secret, password)
  const expected = await hmacHex(secret, secret)
  return timingSafeEqualString(submitted, expected)
}

export function accessCookieOptions(): {
  httpOnly: true
  sameSite: "lax"
  path: "/"
  secure: boolean
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  }
}
