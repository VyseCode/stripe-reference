"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BalanceIcon,
  CheckoutIcon,
  CloseIcon,
  CustomersIcon,
  DashboardIcon,
  DisputeIcon,
  InvoiceIcon,
  KeyIcon,
  Mark,
  MenuIcon,
  PayoutIcon,
  PriceIcon,
  ProductIcon,
  RefundIcon,
  SubscriptionIcon,
  WebhookIcon,
} from "@/components/Icons";

type Item = { href: string; label: string; icon: React.ReactNode };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Workspace",
    items: [
      { href: "/dashboard", label: "Overview", icon: <DashboardIcon /> },
      { href: "/customers", label: "Customers", icon: <CustomersIcon /> },
    ],
  },
  {
    title: "Billing",
    items: [
      { href: "/products", label: "Products", icon: <ProductIcon /> },
      { href: "/prices", label: "Prices", icon: <PriceIcon /> },
      { href: "/subscriptions", label: "Subscriptions", icon: <SubscriptionIcon /> },
      { href: "/checkout", label: "Checkout", icon: <CheckoutIcon /> },
      { href: "/invoices", label: "Invoices", icon: <InvoiceIcon /> },
      { href: "/refunds", label: "Refunds", icon: <RefundIcon /> },
      { href: "/disputes", label: "Disputes", icon: <DisputeIcon /> },
    ],
  },
  {
    title: "Money movement",
    items: [
      { href: "/balance", label: "Balance", icon: <BalanceIcon /> },
      { href: "/payouts", label: "Payouts", icon: <PayoutIcon /> },
    ],
  },
  {
    title: "Developers",
    items: [
      { href: "/api-keys", label: "API keys", icon: <KeyIcon /> },
      { href: "/webhooks", label: "Webhooks", icon: <WebhookIcon /> },
    ],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-6" aria-label="Main navigation">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-inksoft/80">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-accentwash font-semibold text-accentdeep"
                        : "text-inksoft hover:bg-paper hover:text-ink"
                    }`}
                  >
                    <span className={active ? "text-accent" : "text-inksoft/80"}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="lg:hidden">
        <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Mark className="h-7 w-7" />
            <span className="text-sm font-semibold tracking-tight text-ink">
              Ledgerline
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg border border-line bg-surface p-2 text-ink"
            aria-label="Open navigation"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <aside className="hidden w-[236px] shrink-0 flex-col border-r border-line bg-surface px-3 py-6 lg:flex">
        <div className="mb-8 flex items-center gap-2.5 px-3">
          <Mark className="h-8 w-8" />
          <div>
            <p className="text-sm font-semibold tracking-tight text-ink">Ledgerline</p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-inksoft">
              Payments workspace
            </p>
          </div>
        </div>
        <NavLinks />
        <div className="mt-auto rounded-lg border border-line bg-paper px-3 py-3">
          <p className="text-[11px] font-semibold text-ink">Simulation mode</p>
          <p className="mt-1 text-[11px] leading-4 text-inksoft">
            Charges, payouts and webhooks are handled locally.
          </p>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[280px] overflow-y-auto border-r border-line bg-surface px-3 py-5">
            <div className="mb-6 flex items-center justify-between px-2">
              <div className="flex items-center gap-2.5">
                <Mark className="h-7 w-7" />
                <span className="text-sm font-semibold text-ink">Ledgerline</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-inksoft"
                aria-label="Close navigation"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
