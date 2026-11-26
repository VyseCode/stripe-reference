import { Suspense } from "react";
import { connectDB } from "@/lib/db";
import { Payout } from "@/models/Payout";
import { currentBalanceMinor } from "@/lib/ledger";
import { payoutDTO } from "@/lib/serialize";
import { formatMoney } from "@/lib/money";
import { NewPayoutForm, RowAction } from "@/components/ResourceForms";
import { TableSkeleton } from "@/components/Skeleton";
import { Card, EmptyState, PageHeader, StatusPill, TableHead } from "@/components/ui";

export const metadata = { title: "Payouts — Ledgerline" };

async function PayoutTable() {
  await connectDB();
  const docs = await Payout.find().sort({ createdAt: -1 }).limit(100).lean();
  const payouts = docs.map((doc) => payoutDTO(doc));
  if (payouts.length === 0) {
    return (
      <EmptyState
        title="No payouts scheduled"
        description="Schedule a payout to move the available balance to a simulated bank account."
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <TableHead columns={["Payout", "Amount", "Destination", "Status", "Arrival", "Action"]} />
        <tbody>
          {payouts.map((payout) => (
            <tr key={payout.id} className="border-b border-line last:border-0">
              <td className="tnum px-5 py-3.5 font-medium text-ink">{payout.pid}</td>
              <td className="tnum px-5 py-3.5">{formatMoney(payout.amountMinor, payout.currency)}</td>
              <td className="px-5 py-3.5 text-inksoft">{payout.destination}</td>
              <td className="px-5 py-3.5"><StatusPill status={payout.status} /></td>
              <td className="tnum px-5 py-3.5 text-inksoft">
                {new Date(payout.arrivalDate).toLocaleDateString()}
              </td>
              <td className="px-5 py-3.5">
                {payout.status !== "paid" && (
                  <RowAction
                    url={`/api/payouts/${payout.id}/pay`}
                    method="POST"
                    label="Mark paid"
                    variant="primary"
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PayoutsPage() {
  const available = await (async () => {
    await connectDB();
    return currentBalanceMinor();
  })();
  return (
    <>
      <PageHeader
        eyebrow="Money movement"
        title="Payouts"
        description="Move the available balance to a bank account. Transfers are simulated locally."
        action={<NewPayoutForm availableMinor={available} />}
      />
      <Card>
        <Suspense fallback={<TableSkeleton />}>
          <PayoutTable />
        </Suspense>
      </Card>
    </>
  );
}
