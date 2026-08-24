import type { Metadata } from "next"
import FutureEnergyClientLayout from "./client-layout"

export const metadata: Metadata = {
  title: "Future Energy — Meridian OWF procurement",
  description: "Meridian offshore wind farm procurement workspace: tender pipeline, bid evaluation, and controlled documents.",
}

export default function FutureEnergyLayout({ children }: { children: React.ReactNode }) {
  return <FutureEnergyClientLayout>{children}</FutureEnergyClientLayout>
}
