import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { lookupFilter } from "@/lib/ids";
import { Customer } from "@/models/Customer";
import { Invoice } from "@/models/Invoice";
import { PaymentMethod } from "@/models/PaymentMethod";
import { Subscription } from "@/models/Subscription";
import { customerDTO, invoiceDTO, paymentMethodDTO, subscriptionDTO } from "@/lib/serialize";
import { formatMoney } from "@/lib/money";
import { NewPaymentMethodForm, RowAction } from "@/components/ResourceForms";
import { TableSkeleton } from "@/components/Skeleton";
import { ArrowIcon } from "@/components/Icons";
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

export const metadata = { title: "Customer — Ledgerline" };

async function CustomerSections({ customerId, name }: { customerId: string; name: string }) {
  await connectDB();
  const [methods, subscriptions] = await Promise.all([
    PaymentMethod.find({ customer: customerId }).sort({ isDefault: -1, createdAt: -1 }).limit(50).lean(),
    Subscription.find({ customer: customerId }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  const cards = methods.map((doc) => paymentMethodDTO(doc));
  const subs = subscriptions.map((doc) => subscriptionDTO(doc));

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Payment methods"
          hint="Simulated card tokens stored for this customer"
          action={<NewPaymentMethodForm customerId={customerId} customerName={name} />}
        />
        {cards.length === 0 ? (
          <EmptyState
            title="No payment methods on file"
            description="Add a simulated card token to test checkout and payment flows."
          />
        ) : (
          <div className="divide-y divide-line">
            {cards.map((card) => (
              <div key={card.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-12 items-center justify-center rounded-md border border-line bg-paper text-[10px] font-bold uppercase text-ink">
                    {card.brand}
                  </span>
                  <div>
                    <p className="tnum text-sm font-medium text-ink">
                      •••• {card.last4}
                      {card.isDefault && (
                        <span className="ml-2 rounded-full bg-accentwash px-2 py-0.5 text-[10px] font-semibold text-accentdeep">
                          default
                        </span>
                      )}
                    </p>
                    <p className="tnum text-xs text-inksoft">
                      Expires {String(card.expMonth).padStart(2, "0")}/{card.expYear} · {card.pid}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!card.isDefault && (
                    <RowAction
                      url={`/api/payment-methods/${card.id}`}
                      method="PATCH"
                      label="Make default"
                      body={{ isDefault: true }}
                    />
                  )}
                  <RowAction url={`/api/payment-methods/${card.id}`} method="DELETE" label="Remove" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Subscriptions" hint="Recurring billing attached to this customer" />
        {subs.length === 0 ? (
          <EmptyState
            title="No subscriptions yet"
            description="Create a subscription from the subscriptions page to start a billing cycle."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <TableHead columns={["Subscription", "Status", "Period end", "Action"]} />
              <tbody>
                {subs.map((sub) => (
                  <tr key={sub.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3.5">
                      <Link href={`/subscriptions/${sub.id}`} className="font-medium text-ink hover:text-accent hover:underline">
                        {sub.pid}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5"><StatusPill status={sub.status} /></td>
                    <td className="tnum px-5 py-3.5 text-inksoft">
                      {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/subscriptions/${sub.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
                        View <ArrowIcon className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

async function RecentInvoices({ customerId }: { customerId: string }) {
  await connectDB();
  const docs = await Invoice.find({ customer: customerId })
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();
  const invoices = docs.map((doc) => invoiceDTO(doc));
  if (invoices.length === 0) {
    return (
      <EmptyState
        title="No invoices yet"
        description="Invoices appear here after checkout or a billing cycle."
      />
    );
  }
  return (
    <div className="divide-y divide-line">
      {invoices.map((invoice) => (
        <Link
          key={invoice.id}
          href={`/invoices/${invoice.id}`}
          className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-paper/60"
        >
          <div>
            <p className="tnum text-xs font-medium text-ink">{invoice.number}</p>
            <p className="mt-0.5 text-[11px] text-inksoft">
              {new Date(invoice.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="tnum text-sm text-ink">{formatMoney(invoice.amountMinor, invoice.currency)}</p>
            <StatusPill status={invoice.status} />
          </div>
        </Link>
      ))}
    </div>
  );
}

export default async function CustomerDetailPage({
  params,
}: PageProps<"/customers/[id]">) {
  const { id } = await params;
  await connectDB();

  const customer = await Customer.findOne(lookupFilter(id)).lean();
  if (!customer) notFound();
  const detail = customerDTO(customer);

  return (
    <>
      <PageHeader
        eyebrow="Workspace / Customers"
        title={detail.name}
        description={detail.description || "Customer record and billing history."}
        action={<ButtonLink href="/customers" variant="secondary">Back to customers</ButtonLink>}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Suspense fallback={<TableSkeleton />}>
          <CustomerSections customerId={detail.id} name={detail.name} />
        </Suspense>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-2 text-sm font-semibold text-ink">Customer details</h2>
            <dl>
              <KeyValue label="Customer ID"><span className="tnum">{detail.pid}</span></KeyValue>
              <KeyValue label="Email">{detail.email}</KeyValue>
              <KeyValue label="Currency">{detail.currency.toUpperCase()}</KeyValue>
              <KeyValue label="Balance">
                <span className="tnum font-medium">{formatMoney(detail.balanceMinor, detail.currency)}</span>
              </KeyValue>
              <KeyValue label="Created">{new Date(detail.createdAt).toLocaleDateString()}</KeyValue>
            </dl>
          </Card>
          <Card>
            <CardHeader title="Recent invoices" hint="Latest eight invoices" />
            <Suspense fallback={<TableSkeleton rows={3} />}>
              <RecentInvoices customerId={detail.id} />
            </Suspense>
          </Card>
        </div>
      </div>
    </>
  );
}
