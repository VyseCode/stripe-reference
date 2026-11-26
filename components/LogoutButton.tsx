"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoutIcon } from "@/components/Icons";

export function LogoutButton({ name }: { name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-2.5">
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white"
        aria-hidden="true"
      >
        {initials}
      </span>
      <span className="hidden text-xs font-medium text-ink sm:block">{name}</span>
      <button
        type="button"
        onClick={logout}
        disabled={busy}
        className="ml-1 rounded-md p-1.5 text-inksoft transition-colors hover:bg-paper hover:text-signal disabled:opacity-50"
        aria-label="Sign out"
        title="Sign out"
      >
        <LogoutIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
