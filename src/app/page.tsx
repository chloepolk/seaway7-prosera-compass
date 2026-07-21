import Link from "next/link";

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Prototype Starter</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Standard shell for rapid prototype builds.
      </p>

      <div className="mt-6">
        <Link className="underline" href="/prototype">
          Go to Prototypes
        </Link>
      </div>
    </main>
  );
}
