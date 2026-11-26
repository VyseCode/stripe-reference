import { Suspense } from "react";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Dispute } from "@/models/Dispute";
import { disputeDTO } from "@/lib/serialize";
import { formatMoney } from "@/lib/money";
import { NewDisputeForm, RowAction } from "@/components/ResourceForms";
import { TableSkeleton } from "@/components/Skeleton";
import { Card, EmptyState, PageHeader, StatusPill, TableHead } from "@/components/ui";

export const metadata = { title: "Disputes — Ledgerline" };

async function DisputeTable() {
  await connectDB();
  const docs = await Dispute.find().sort({ createdAt: -1 }).limit(100).lean();
  const disputes = docs.map((doc) => disputeDTO(doc));
  if (disputes.length === 0) {
    return (
      <EmptyState
        title="No disputes on file"
        description="Disputes opened against charges will be listed here with their outcomes."
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] text-left text-sm">
        <TableHead columns={["Dispute", "Charge", "Amount", "Reason", "Status", "Resolve"]} />
        <tbody>
          {disputes.map((dispute) => (
            <tr key={dispute.id} className="border-b border-line last:border-0">
              <td className="tnum px-5 py-3.5 font-medium text-ink">{dispute.pid}</td>
              <td className="tnum px-5 py-3.5 text-inksoft">{dispute.chargeRef}</td>
              <td className="tnum px-5 py-3.5">{formatMoney(dispute.amountMinor, dispute.currency)}</td>
              <td className="px-5 py-3.5 text-inksoft">{dispute.reason.replace(/_/g, " ")}</td>
              <td className="px-5 py-3.5"><StatusPill status={dispute.status} /></td>
              <td className="px-5 py-3.5">
                {dispute.status === "open" ? (
                  <div className="flex gap-1.5">
                    <RowAction url={`/api/disputes/${dispute.id}`} method="PATCH" label="Win" body={{ status: "won" }} />
                    <RowAction url={`/api/disputes/${dispute.id}`} method="PATCH" label="Lose" body={{ status: "lost" }} />
                  </div>
                ) : (
                  <span className="text-xs text-inksoft">Closed</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function DisputesPage() {
  await connectDB();
  const invoices = await Invoice.find({ status: "paid" }).sort({ createdAt: -1 }).limit(100).lean();
  return (
    <>
      <PageHeader
        eyebrow="Money movement"
        title="Disputes"
        description="Track contested charges and record the outcome of each case."
        action={
          <NewDisputeForm
            invoices={invoices.map((invoice) => ({
              id: invoice._id.toString(),
              label: `${invoice.number} — ${formatMoney(invoice.amountMinor, invoice.currency)}`,
            }))}
          />
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton />}>
          <DisputeTable />
        </Suspense>
      </Card>
    </>
  );
}
