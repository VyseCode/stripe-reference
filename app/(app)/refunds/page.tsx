import { Suspense } from "react";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Refund } from "@/models/Refund";
import { refundDTO } from "@/lib/serialize";
import { formatMoney } from "@/lib/money";
import { NewRefundForm } from "@/components/ResourceForms";
import { TableSkeleton } from "@/components/Skeleton";
import { Card, EmptyState, PageHeader, StatusPill, TableHead } from "@/components/ui";

export const metadata = { title: "Refunds — Ledgerline" };

async function RefundTable() {
  await connectDB();
  const docs = await Refund.find().sort({ createdAt: -1 }).limit(100).lean();
  const refunds = docs.map((doc) => refundDTO(doc));
  if (refunds.length === 0) {
    return (
      <EmptyState
        title="No refunds issued"
        description="Refunds appear here after you issue one against an invoice."
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <TableHead columns={["Refund", "Charge", "Amount", "Reason", "Status", "Date"]} />
        <tbody>
          {refunds.map((refund) => (
            <tr key={refund.id} className="border-b border-line last:border-0">
              <td className="tnum px-5 py-3.5 font-medium text-ink">{refund.pid}</td>
              <td className="tnum px-5 py-3.5 text-inksoft">{refund.chargeRef}</td>
              <td className="tnum px-5 py-3.5">−{formatMoney(refund.amountMinor, refund.currency)}</td>
              <td className="px-5 py-3.5 text-inksoft">{refund.reason.replace(/_/g, " ")}</td>
              <td className="px-5 py-3.5"><StatusPill status={refund.status} /></td>
              <td className="px-5 py-3.5 text-inksoft">
                {new Date(refund.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function RefundsPage() {
  await connectDB();
  const invoices = await Invoice.find({ status: { $in: ["paid", "open"] } })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  const refunds = await Refund.find({ status: { $in: ["succeeded", "pending"] } }).lean();
  const refundedBySource = new Map<string, number>();
  for (const refund of refunds) {
    refundedBySource.set(
      refund.sourceRef,
      (refundedBySource.get(refund.sourceRef) ?? 0) + refund.amountMinor,
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Money movement"
        title="Refunds"
        description="Return funds against an existing charge. Amounts are checked against prior refunds."
        action={
          <NewRefundForm
            invoices={invoices.map((invoice) => ({
              id: invoice._id.toString(),
              label: `${invoice.number} — ${formatMoney(
                Math.max(invoice.amountMinor - (refundedBySource.get(invoice.pid) ?? 0), 0),
                invoice.currency,
              )} available`,
              refundableMinor: invoice.amountMinor,
            }))}
          />
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton />}>
          <RefundTable />
        </Suspense>
      </Card>
    </>
  );
}
