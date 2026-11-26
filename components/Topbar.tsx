import { BoltIcon, SearchIcon } from "@/components/Icons";
import { LogoutButton } from "@/components/LogoutButton";

export function Topbar({ name }: { name: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
      <form action="/customers" method="get" className="relative w-full max-w-xs" role="search">
        <label htmlFor="topbar-search" className="sr-only">
          Search customers
        </label>
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-inksoft" />
        <input
          id="topbar-search"
          name="search"
          type="search"
          placeholder="Search customers…"
          className="w-full rounded-lg border border-line bg-paper py-2 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
        />
      </form>
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accentwash px-2.5 py-1 text-[11px] font-semibold text-accentdeep">
          <BoltIcon className="h-3.5 w-3.5" />
          Local simulation
        </span>
        <span className="hidden h-5 w-px bg-line sm:block" />
        <LogoutButton name={name} />
      </div>
    </div>
  );
}
