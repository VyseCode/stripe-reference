import Link from "next/link";
import type { ReactNode } from "react";
import { formatMoney } from "@/lib/money";
import { ArrowIcon } from "@/components/Icons";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(20,33,43,0.03)] ${className}`}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-inksoft">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-[28px]">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-inksoft">{description}</p>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </header>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  const classes =
    variant === "primary"
      ? "bg-accent text-white hover:bg-accentdeep border-accent"
      : "bg-surface text-ink hover:bg-paper border-line";
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${classes}`}
    >
      {children}
    </Link>
  );
}

export const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-accent bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accentdeep disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60";

export const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-inksoft/70 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15";

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-inksoft">{hint}</p>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-accentwash text-accentdeep",
  trialing: "bg-sky-50 text-sky-800",
  past_due: "bg-signalwash text-signal",
  canceled: "bg-slate-100 text-slate-600",
  open: "bg-sky-50 text-sky-800",
  complete: "bg-accentwash text-accentdeep",
  complete_label: "bg-accentwash text-accentdeep",
  failed: "bg-signalwash text-signal",
  expired: "bg-slate-100 text-slate-600",
  paid: "bg-emerald-50 text-positive",
  draft: "bg-slate-100 text-slate-600",
  void: "bg-slate-100 text-slate-600",
  uncollectible: "bg-signalwash text-signal",
  succeeded: "bg-emerald-50 text-positive",
  pending: "bg-amber-50 text-amber-800",
  won: "bg-emerald-50 text-positive",
  lost: "bg-signalwash text-signal",
  closed: "bg-slate-100 text-slate-600",
  received: "bg-sky-50 text-sky-800",
  processed: "bg-emerald-50 text-positive",
  duplicate: "bg-amber-50 text-amber-800",
  read: "bg-slate-100 text-slate-600",
  write: "bg-sky-50 text-sky-800",
  admin: "bg-accentwash text-accentdeep",
  one_time: "bg-slate-100 text-slate-600",
  month: "bg-sky-50 text-sky-800",
  year: "bg-accentwash text-accentdeep",
  card: "bg-slate-100 text-slate-600",
};

export function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${style}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export function Money({
  minor,
  currency = "usd",
  negative = false,
  strong = false,
}: {
  minor: number;
  currency?: string;
  negative?: boolean;
  strong?: boolean;
}) {
  const value = negative ? -Math.abs(minor) : minor;
  return (
    <span className={`tnum ${strong ? "font-semibold text-ink" : ""}`}>
      {formatMoney(value, currency)}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  href,
  actionLabel,
}: {
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-accentwash text-accent">
        <ArrowIcon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-inksoft">{description}</p>
      {href && actionLabel && (
        <div className="mt-5">
          <ButtonLink href={href}>
            <span>{actionLabel}</span>
            <ArrowIcon className="h-4 w-4" />
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

export function KeyValue({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-3 last:border-0">
      <dt className="text-xs font-medium text-inksoft">{label}</dt>
      <dd className="text-right text-sm text-ink">{children}</dd>
    </div>
  );
}

export function Metric({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.11em] text-inksoft">
          {label}
        </p>
        <span className="text-accent">{icon}</span>
      </div>
      <p className="tnum mt-3 text-[28px] font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-xs text-inksoft">{hint}</p>
    </Card>
  );
}

export function TableHead({ columns }: { columns: string[] }) {
  return (
    <thead>
      <tr className="border-b border-line bg-paper/60">
        {columns.map((column) => (
          <th
            key={column}
            scope="col"
            className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-inksoft"
          >
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function Pagination({
  page,
  total,
  limit,
  basePath,
  extra = "",
}: {
  page: number;
  total: number;
  limit: number;
  basePath: string;
  extra?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  const link = (n: number, label: string) => (
    <Link
      href={`${basePath}?page=${n}${extra}`}
      className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
        n === page
          ? "border-accent bg-accent text-white"
          : "border-line bg-surface text-ink hover:bg-paper"
      }`}
      aria-current={n === page ? "page" : undefined}
    >
      {label}
    </Link>
  );
  return (
    <nav className="flex items-center justify-between border-t border-line px-5 py-3" aria-label="Pagination">
      <span className="tnum text-xs text-inksoft">
        Page {page} of {pages} · {total} records
      </span>
      <div className="flex items-center gap-1.5">
        {page > 1 && link(page - 1, "Previous")}
        {page < pages && link(page + 1, "Next")}
      </div>
    </nav>
  );
}
