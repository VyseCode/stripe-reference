import Link from "next/link";
import { Suspense } from "react";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Price } from "@/models/Price";
import { CheckoutSession } from "@/models/CheckoutSession";
import { checkoutDTO } from "@/lib/serialize";
import { formatMoney } from "@/lib/money";
import { NewCheckoutForm } from "@/components/ResourceForms";
import { TableSkeleton } from "@/components/Skeleton";
import { Card, EmptyState, PageHeader, StatusPill, TableHead } from "@/components/ui";

export const metadata = { title: "Checkout — Ledgerline" };

async function CheckoutTable({ status }: { status: string }) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (status !== "all") filter.status = status;
  const docs = await CheckoutSession.find(filter)
    .populate("customer", "name")
    .populate("price", "unitAmountMinor currency")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  const sessions = docs.map((doc) => checkoutDTO(doc));
  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No checkout sessions"
        description="Create a session to simulate a payment, then complete it from the hosted checkout page."
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <TableHead columns={["Session", "Customer", "Amount", "Mode", "Status", "Created"]} />
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id} className="border-b border-line last:border-0 hover:bg-paper/60">
              <td className="px-5 py-3.5">
                <Link href={`/checkout/${session.id}`} className="tnum font-medium text-ink hover:text-accent hover:underline">
                  {session.pid}
                </Link>
              </td>
              <td className="px-5 py-3.5 text-inksoft">{session.customerName || "—"}</td>
              <td className="tnum px-5 py-3.5">{formatMoney(session.amountMinor, session.currency)}</td>
              <td className="px-5 py-3.5 text-inksoft">{session.mode}</td>
              <td className="px-5 py-3.5"><StatusPill status={session.status} /></td>
              <td className="px-5 py-3.5 text-inksoft">
                {new Date(session.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function CheckoutPage({
  searchParams,
}: PageProps<"/checkout">) {
  const params = await searchParams;
  const requested = typeof params.status === "string" ? params.status : "all";
  const status = ["all", "open", "complete", "failed", "expired"].includes(requested)
    ? requested
    : "all";

  const [customers, prices] = await Promise.all([
    Customer.find().sort({ name: 1 }).limit(100).select("name").lean(),
    Price.find({ active: true }).limit(100).lean(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Checkout"
        description="Hosted checkout sessions with simulated success and failure outcomes."
        action={
          <NewCheckoutForm
            customers={customers.map((customer) => ({ id: customer._id.toString(), name: customer.name }))}
            prices={prices.map((price) => ({
              id: price._id.toString(),
              label: `${formatMoney(price.unitAmountMinor, price.currency)} / ${price.interval}`,
            }))}
          />
        }
      />
      <div className="mb-4 flex flex-wrap gap-2" aria-label="Filter checkout sessions">
        {["all", "open", "complete", "failed", "expired"].map((filter) => (
          <Link
            key={filter}
            href={`/checkout${filter === "all" ? "" : `?status=${filter}`}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              status === filter
                ? "border-accent bg-accent text-white"
                : "border-line bg-surface text-inksoft hover:text-ink"
            }`}
            aria-current={status === filter ? "page" : undefined}
          >
            {filter}
          </Link>
        ))}
      </div>
      <Card>
        <Suspense fallback={<TableSkeleton />}>
          <CheckoutTable status={status} />
        </Suspense>
      </Card>
    </>
  );
}
