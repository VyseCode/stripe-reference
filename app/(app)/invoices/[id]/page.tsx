import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { lookupFilter } from "@/lib/ids";
import { Invoice } from "@/models/Invoice";
import { invoiceDTO } from "@/lib/serialize";
import { formatMoney } from "@/lib/money";
import { RowAction } from "@/components/ResourceForms";
import { ExternalIcon } from "@/components/Icons";
import { ButtonLink, Card, CardHeader, KeyValue, PageHeader, StatusPill, TableHead } from "@/components/ui";

export const metadata = { title: "Invoice — Ledgerline" };

export default async function InvoiceDetailPage({
  params,
}: PageProps<"/invoices/[id]">) {
  const { id } = await params;
  await connectDB();
  const doc = await Invoice.findOne(lookupFilter(id))
    .populate("customer", "name email")
    .lean();
  if (!doc) notFound();
  const invoice = invoiceDTO(doc);
  const payable = invoice.status === "open" || invoice.status === "draft" || invoice.status === "uncollectible";

  return (
    <>
      <PageHeader
        eyebrow="Billing / Invoices"
        title={invoice.number}
        description={`Issued ${new Date(invoice.createdAt).toLocaleDateString()} · ${invoice.status.replace("_", " ")}`}
        action={
          <ButtonLink href={`/api/invoices/${invoice.id}/html`} variant="secondary">
            <ExternalIcon className="h-4 w-4" />
            Printable HTML
          </ButtonLink>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader title="Line items" hint="Amounts are integer minor units in the UI data model" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <TableHead columns={["Description", "Qty", "Unit", "Amount"]} />
              <tbody>
                {invoice.lines.map((line) => (
                  <tr key={line.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3.5">{line.description}</td>
                    <td className="tnum px-5 py-3.5 text-inksoft">{line.quantity}</td>
                    <td className="tnum px-5 py-3.5 text-inksoft">
                      {formatMoney(line.unitAmountMinor, invoice.currency)}
                    </td>
                    <td className="tnum px-5 py-3.5 font-medium text-ink">
                      {formatMoney(line.amountMinor, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ml-auto max-w-xs px-5 py-4">
            <div className="flex justify-between py-1 text-sm">
              <span className="text-inksoft">Subtotal</span>
              <span className="tnum">{formatMoney(invoice.subtotalMinor, invoice.currency)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span className="text-inksoft">Tax</span>
              <span className="tnum">{formatMoney(invoice.taxMinor, invoice.currency)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t-2 border-ink py-2 text-sm font-semibold">
              <span>Total</span>
              <span className="tnum">{formatMoney(invoice.amountMinor, invoice.currency)}</span>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-2 text-sm font-semibold text-ink">Invoice details</h2>
            <dl>
              <KeyValue label="Status"><StatusPill status={invoice.status} /></KeyValue>
              <KeyValue label="Customer">{invoice.customerName || "—"}</KeyValue>
              <KeyValue label="Currency">{invoice.currency.toUpperCase()}</KeyValue>
              <KeyValue label="Due date">
                {invoice.dueDate ? <span className="tnum">{new Date(invoice.dueDate).toLocaleDateString()}</span> : "—"}
              </KeyValue>
              <KeyValue label="Paid at">
                {invoice.paidAt ? <span className="tnum">{new Date(invoice.paidAt).toLocaleDateString()}</span> : "—"}
              </KeyValue>
              <KeyValue label="Subscription">
                {invoice.subscriptionId ? (
                  <a href={`/subscriptions/${invoice.subscriptionId}`} className="tnum text-accent hover:underline">
                    View
                  </a>
                ) : "One-time"}
              </KeyValue>
            </dl>
          </Card>
          <Card>
            <CardHeader title="Payment actions" hint="Simulated adapter" />
            {payable ? (
              <div className="flex flex-wrap gap-2 p-5">
                <RowAction
                  url={`/api/invoices/${invoice.id}/pay`}
                  method="POST"
                  label="Mark paid"
                  body={{ outcome: "success" }}
                  variant="primary"
                />
                <RowAction
                  url={`/api/invoices/${invoice.id}/pay`}
                  method="POST"
                  label="Simulate failure"
                  body={{ outcome: "failure" }}
                />
              </div>
            ) : (
              <p className="px-5 py-5 text-sm text-inksoft">
                This invoice is {invoice.status} and cannot be paid again.
              </p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
