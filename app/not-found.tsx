import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
        404 · Not found
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
        Nothing at this address
      </h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-inksoft">
        The record may have been removed, or the link may be incomplete. Head back to
        the overview to keep working.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-lg border border-accent bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accentdeep"
      >
        Back to overview
      </Link>
    </main>
  );
}
