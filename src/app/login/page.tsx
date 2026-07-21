"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/prosera/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/prosera/card"
import { Input } from "@/components/ui/prosera/input"

const COMPASS_ROUTE = "/prototype/prosera-compass"
const PROSERA_LOGO = "/full%20dark%20logo.svg"

export default function LoginPage() {
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(COMPASS_ROUTE)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-6 py-12">
      <div className="w-full max-w-[420px]">
        <Card className="rounded-2xl border-border/60 shadow-xl">
          <CardHeader className="items-center space-y-4 pb-2 text-center">
            <Image
              src={PROSERA_LOGO}
              alt="Prosera"
              width={160}
              height={32}
              className="h-8 w-auto"
              priority
            />
            <div className="space-y-1">
              <CardTitle className="text-[20px] font-semibold tracking-tight text-foreground">
                Prosera Compass
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Intelligence Cockpit
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue="demo@prosera.io"
                  autoComplete="email"
                  autoFocus
                  className="h-11 rounded-[10px] bg-card"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  defaultValue="prosera"
                  autoComplete="current-password"
                  className="h-11 rounded-[10px] bg-card"
                />
              </div>

              <Button type="submit" className="h-11 w-full rounded-[10px] text-sm font-semibold">
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-[11px] text-sidebar-foreground/45">
          Powered by Prosera
        </p>
      </div>
    </div>
  )
}
