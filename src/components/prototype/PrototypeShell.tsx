import React from "react";
import Link from "next/link";

type PrototypeShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export default function PrototypeShell({
  title,
  description,
  children,
}: PrototypeShellProps) {
  return (
    <main className="p-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && (
          <p className="text-sm text-neutral-600">{description}</p>
        )}
      </header>

      <section className="rounded-lg border border-border bg-background p-4">
        {children}
      </section>

      <footer className="pt-4">
        <Link
          href="/prototype"
          className="text-sm text-neutral-600 underline"
        >
          ← Back to prototypes
        </Link>
      </footer>
    </main>
  );
}
