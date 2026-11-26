import Link from "next/link";
import { Suspense } from "react";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Price } from "@/models/Price";
import { Subscription } from "@/models/Subscription";
import { subscriptionDTO } from "@/lib/serialize";
import { formatMoney } from "@/lib/money";
import { NewSubscriptionForm } from "@/components/ResourceForms";
import { TableSkeleton } from "@/components/Skeleton";
import { Card, EmptyState, PageHeader, StatusPill, TableHead } from "@/components/ui";

export const metadata = { title: "Subscriptions — Ledgerline" };

const FILTERS = ["all", "trialing", "active", "past_due", "canceled"];

async function SubscriptionTable({ status }: { status: string }) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (status !== "all") filter.status = status;
  const docs = await Subscription.find(filter)
    .populate("customer", "name")
    .populate("price", "unitAmountMinor interval currency")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  const subscriptions = docs.map((doc) => subscriptionDTO(doc));

  if (subscriptions.length === 0) {
    return (
      <EmptyState
        title={`No ${status === "all" ? "" : `${status.replace("_", " ")} `}subscriptions`}
        description="Start a subscription or clear the filter to see every billing cycle."
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[840px] text-left text-sm">
        <TableHead columns={["Subscription", "Customer", "Price", "Status", "Period end", "Cancellation"]} />
        <tbody>
          {subscriptions.map((sub) => (
            <tr key={sub.id} className="border-b border-line last:border-0 hover:bg-paper/60">
              <td className="px-5 py-3.5">
                <Link href={`/subscriptions/${sub.id}`} className="tnum font-medium text-ink hover:text-accent hover:underline">
                  {sub.pid}
                </Link>
              </td>
              <td className="px-5 py-3.5 text-inksoft">{sub.customerName || "—"}</td>
              <td className="tnum px-5 py-3.5 text-inksoft">{sub.priceLabel || "—"}</td>
              <td className="px-5 py-3.5"><StatusPill status={sub.status} /></td>
              <td className="tnum px-5 py-3.5 text-inksoft">
                {new Date(sub.currentPeriodEnd).toLocaleDateString()}
              </td>
              <td className="px-5 py-3.5">
                {sub.cancelAtPeriodEnd ? (
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                    At period end
                  </span>
                ) : (
                  <span className="text-xs text-inksoft">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function SubscriptionsPage({
  searchParams,
}: PageProps<"/subscriptions">) {
  const params = await searchParams;
  const requested = typeof params.status === "string" ? params.status : "all";
  const status = FILTERS.includes(requested) ? requested : "all";

  const [customers, prices] = await Promise.all([
    Customer.find().sort({ name: 1 }).limit(100).select("name").lean(),
    Price.find({ active: true, interval: { $ne: "one_time" } }).limit(100).lean(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Subscriptions"
        description="Recurring billing cycles with trial, active, past-due and canceled states."
        action={
          <NewSubscriptionForm
            customers={customers.map((customer) => ({ id: customer._id.toString(), name: customer.name }))}
            prices={prices.map((price) => ({
              id: price._id.toString(),
              label: `${formatMoney(price.unitAmountMinor, price.currency)} / ${price.interval}`,
            }))}
          />
        }
      />

      <div className="mb-4 flex flex-wrap gap-2" aria-label="Filter subscriptions by status">
        {FILTERS.map((filter) => (
          <Link
            key={filter}
            href={`/subscriptions${filter === "all" ? "" : `?status=${filter}`}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              status === filter
                ? "border-accent bg-accent text-white"
                : "border-line bg-surface text-inksoft hover:text-ink"
            }`}
            aria-current={status === filter ? "page" : undefined}
          >
            {filter.replace("_", " ")}
          </Link>
        ))}
      </div>

      <Card>
        <Suspense fallback={<TableSkeleton />}>
          <SubscriptionTable status={status} />
        </Suspense>
      </Card>
    </>
  );
}
