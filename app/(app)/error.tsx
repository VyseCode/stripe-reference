"use client";

import { useEffect } from "react";
import { AlertIcon } from "@/components/Icons";
import { Card } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error", error);
  }, [error]);

  return (
    <Card className="mx-auto max-w-lg p-8 text-center">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-signalwash text-signal">
        <AlertIcon className="h-5 w-5" />
      </div>
      <h1 className="text-lg font-semibold text-ink">This page could not be loaded</h1>
      <p className="mt-2 text-sm leading-6 text-inksoft">
        Something went wrong while reading the ledger. Try again — your data is safe.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-lg border border-accent bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accentdeep"
      >
        Try again
      </button>
    </Card>
  );
}
