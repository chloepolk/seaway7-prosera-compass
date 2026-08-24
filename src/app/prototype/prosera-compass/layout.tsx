import type { Metadata } from "next"
import ProseraCompassClientLayout from "./client-layout"

export const metadata: Metadata = {
  title: "Prosera Compass",
  description: "Prosera Compass — supply chain intelligence for offshore wind procurement.",
}

export default function ProseraCompassLayout({ children }: { children: React.ReactNode }) {
  return <ProseraCompassClientLayout>{children}</ProseraCompassClientLayout>
}
