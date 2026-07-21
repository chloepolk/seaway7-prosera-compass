import Link from "next/link"
import { PROTOTYPES } from "@/lib/prototypes"

export default function PrototypeHub() {
  return (
    <main className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Prototypes</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Isolated prototype environments running on a shared scaffold.
        </p>
      </header>

      <ul className="space-y-4">
        {PROTOTYPES.map((p) => (
          <li key={p.slug} className="border rounded-lg p-4">
            <Link
              href={`/prototype/${p.slug}`}
              className="text-lg font-medium underline"
            >
              {p.name}
            </Link>
            {p.description && (
              <p className="mt-1 text-sm text-neutral-600">
                {p.description}
              </p>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}
