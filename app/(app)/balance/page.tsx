import { Suspense } from "react";
import { connectDB } from "@/lib/db";
import { LedgerEntry } from "@/models/LedgerEntry";
import { currentBalanceMinor } from "@/lib/ledger";
import { ledgerDTO } from "@/lib/serialize";
import { formatMoney } from "@/lib/money";
import { BalanceIcon, PayoutIcon, RefundIcon, TrendIcon } from "@/components/Icons";
import { TableSkeleton } from "@/components/Skeleton";
import { Card, CardHeader, EmptyState, Metric, StatusPill, TableHead } from "@/components/ui";

export const metadata = { title: "Balance — Ledgerline" };

async function LedgerTable() {
  await connectDB();
  const docs = await LedgerEntry.find().sort({ createdAt: -1 }).limit(100).lean();
  const entries = docs.map((doc) => ledgerDTO(doc));
  if (entries.length === 0) {
    return <EmptyState title="The ledger is empty" description="Charge, refund and payout activity will appear here." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <TableHead columns={["Entry", "Type", "Amount", "Balance after", "Date"]} />
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-line last:border-0">
              <td className="px-5 py-3.5">
                <p className="max-w-[280px] truncate font-medium text-ink">{entry.description}</p>
                <p className="tnum mt-0.5 text-[11px] text-inksoft">{entry.sourceRef}</p>
              </td>
              <td className="px-5 py-3.5"><StatusPill status={entry.kind} /></td>
              <td className={`tnum px-5 py-3.5 font-medium ${entry.amountMinor < 0 ? "text-signal" : "text-positive"}`}>
                {entry.amountMinor < 0 ? "−" : "+"}{formatMoney(Math.abs(entry.amountMinor), entry.currency)}
              </td>
              <td className="tnum px-5 py-3.5 text-inksoft">
                {formatMoney(entry.balanceAfterMinor, entry.currency)}
              </td>
              <td className="px-5 py-3.5 text-inksoft">
                {new Date(entry.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function BalancePage() {
  await connectDB();
  const [balance, charges, refunds, payouts] = await Promise.all([
    currentBalanceMinor(),
    LedgerEntry.aggregate([{ $match: { kind: "charge" } }, { $group: { _id: null, total: { $sum: "$amountMinor" } } }]),
    LedgerEntry.aggregate([{ $match: { kind: "refund" } }, { $group: { _id: null, total: { $sum: "$amountMinor" } } }]),
    LedgerEntry.aggregate([{ $match: { kind: "payout" } }, { $group: { _id: null, total: { $sum: "$amountMinor" } } }]),
  ]);

  return (
    <>
      <div className="mb-6">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Money movement</p>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-[28px]">Balance</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-inksoft">
          A double-checkable ledger of charges, fees, refunds, disputes and payouts.
        </p>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Available" value={formatMoney(balance)} hint="Current ledger balance" icon={<BalanceIcon />} />
        <Metric label="Charges" value={formatMoney(charges[0]?.total ?? 0)} hint="Gross collected" icon={<TrendIcon />} />
        <Metric label="Refunds" value={formatMoney(refunds[0]?.total ?? 0)} hint="Returned to customers" icon={<RefundIcon />} />
        <Metric label="Payouts" value={formatMoney(Math.abs(payouts[0]?.total ?? 0))} hint="Sent to bank account" icon={<PayoutIcon />} />
      </div>

      <Card>
        <CardHeader title="Balance ledger" hint="Every entry carries the running balance after it was recorded" />
        <Suspense fallback={<TableSkeleton />}>
          <LedgerTable />
        </Suspense>
      </Card>
    </>
  );
}
