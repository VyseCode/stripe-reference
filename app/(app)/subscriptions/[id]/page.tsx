import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { lookupFilter } from "@/lib/ids";
import { Subscription } from "@/models/Subscription";
import { Invoice } from "@/models/Invoice";
import { subscriptionDTO, invoiceDTO } from "@/lib/serialize";
import { formatMoney } from "@/lib/money";
import { RowAction } from "@/components/ResourceForms";
import { TableSkeleton } from "@/components/Skeleton";
import {
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  KeyValue,
  PageHeader,
  StatusPill,
  TableHead,
} from "@/components/ui";

export const metadata = { title: "Subscription — Ledgerline" };

async function SubscriptionInvoices({ subscriptionId }: { subscriptionId: string }) {
  await connectDB();
  const docs = await Invoice.find({ subscription: subscriptionId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  const invoices = docs.map((doc) => invoiceDTO(doc));
  if (invoices.length === 0) {
    return (
      <EmptyState
        title="No invoices in this cycle yet"
        description="Run a billing cycle or complete a checkout to generate an invoice."
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <TableHead columns={["Invoice", "Date", "Amount", "Status", "View"]} />
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-b border-line last:border-0">
              <td className="tnum px-5 py-3.5 font-medium text-ink">{invoice.number}</td>
              <td className="px-5 py-3.5 text-inksoft">
                {new Date(invoice.createdAt).toLocaleDateString()}
              </td>
              <td className="tnum px-5 py-3.5">{formatMoney(invoice.amountMinor, invoice.currency)}</td>
              <td className="px-5 py-3.5"><StatusPill status={invoice.status} /></td>
              <td className="px-5 py-3.5">
                <Link href={`/invoices/${invoice.id}`} className="text-xs font-semibold text-accent hover:underline">
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function SubscriptionDetailPage({
  params,
}: PageProps<"/subscriptions/[id]">) {
  const { id } = await params;
  await connectDB();
  const doc = await Subscription.findOne(lookupFilter(id))
    .populate("customer", "name")
    .populate("price", "unitAmountMinor interval currency")
    .lean();
  if (!doc) notFound();
  const sub = subscriptionDTO(doc);
  const active = sub.status !== "canceled";

  return (
    <>
      <PageHeader
        eyebrow="Billing / Subscriptions"
        title={sub.pid}
        description={`Billing cycle for ${sub.customerName || "a customer"} · ${sub.priceLabel || "recurring price"}`}
        action={<ButtonLink href="/subscriptions" variant="secondary">Back to subscriptions</ButtonLink>}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Lifecycle actions" hint="All actions run against the local payment adapter" />
            {active ? (
              <div className="flex flex-wrap gap-2 p-5">
                {!sub.cancelAtPeriodEnd && (
                  <RowAction
                    url={`/api/subscriptions/${sub.id}/cancel`}
                    method="POST"
                    label="Cancel at period end"
                    body={{ atPeriodEnd: true }}
                    variant="primary"
                  />
                )}
                <RowAction
                  url={`/api/subscriptions/${sub.id}/cancel`}
                  method="POST"
                  label="Cancel now"
                  body={{ atPeriodEnd: false }}
                />
                {!sub.cancelAtPeriodEnd && (
                  <RowAction
                    url={`/api/subscriptions/${sub.id}/cycle`}
                    method="POST"
                    label="Run billing cycle"
                    body={{}}
                  />
                )}
                <RowAction
                  url={`/api/subscriptions/${sub.id}/payment`}
                  method="POST"
                  label="Retry payment (success)"
                  body={{ outcome: "success" }}
                />
                <RowAction
                  url={`/api/subscriptions/${sub.id}/payment`}
                  method="POST"
                  label="Simulate failed payment"
                  body={{ outcome: "failure" }}
                />
              </div>
            ) : (
              <EmptyState
                title="This subscription is canceled"
                description="Canceled subscriptions cannot be billed again. Create a new subscription to resume service."
              />
            )}
          </Card>

          <Card>
            <CardHeader title="Invoices" hint="Invoices generated for this subscription" />
            <Suspense fallback={<TableSkeleton rows={3} />}>
              <SubscriptionInvoices subscriptionId={sub.id} />
            </Suspense>
          </Card>
        </div>

        <Card className="h-fit p-5">
          <h2 className="mb-2 text-sm font-semibold text-ink">Subscription details</h2>
          <dl>
            <KeyValue label="Status"><StatusPill status={sub.status} /></KeyValue>
            <KeyValue label="Customer">
              {sub.customerId ? (
                <Link href={`/customers/${sub.customerId}`} className="text-accent hover:underline">
                  {sub.customerName || sub.customerId}
                </Link>
              ) : "—"}
            </KeyValue>
            <KeyValue label="Price"><span className="tnum">{sub.priceLabel || "—"}</span></KeyValue>
            <KeyValue label="Period start">
              <span className="tnum">{new Date(sub.currentPeriodStart).toLocaleDateString()}</span>
            </KeyValue>
            <KeyValue label="Period end">
              <span className="tnum">{new Date(sub.currentPeriodEnd).toLocaleDateString()}</span>
            </KeyValue>
            <KeyValue label="Cancel at period end">
              {sub.cancelAtPeriodEnd ? "Yes" : "No"}
            </KeyValue>
            <KeyValue label="Trial ends">
              {sub.trialEnd ? <span className="tnum">{new Date(sub.trialEnd).toLocaleDateString()}</span> : "—"}
            </KeyValue>
            <KeyValue label="Canceled at">
              {sub.canceledAt ? <span className="tnum">{new Date(sub.canceledAt).toLocaleDateString()}</span> : "—"}
            </KeyValue>
          </dl>
        </Card>
      </div>
    </>
  );
}
