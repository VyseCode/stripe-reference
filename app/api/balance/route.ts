import { handleError, ok } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { LedgerEntry } from "@/models/LedgerEntry";
import { Refund } from "@/models/Refund";
import { Payout } from "@/models/Payout";
import { currentBalanceMinor } from "@/lib/ledger";
import { ledgerDTO } from "@/lib/serialize";

export async function GET() {
  try {
    await connectDB();
    const [balanceMinor, breakdown, recent, pendingPayouts] = await Promise.all([
      currentBalanceMinor(),
      LedgerEntry.aggregate([
        { $group: { _id: "$kind", total: { $sum: "$amountMinor" }, count: { $sum: 1 } } },
      ]),
      LedgerEntry.find().sort({ createdAt: -1 }).limit(8).lean(),
      Payout.aggregate([
        { $match: { status: "pending" } },
        { $group: { _id: null, total: { $sum: "$amountMinor" } } },
      ]),
    ]);

    return ok({
      balance: {
        availableMinor: balanceMinor,
        pendingPayoutMinor: pendingPayouts[0]?.total ?? 0,
        reservedMinor: 0,
        currency: "usd",
        breakdown: Object.fromEntries(
          breakdown.map((row) => [row._id, { totalMinor: row.total, count: row.count }]),
        ),
        refundCount: await Refund.countDocuments({ status: "succeeded" }),
      },
      recentTransactions: recent.map((doc) => ledgerDTO(doc)),
    });
  } catch (error) {
    return handleError(error);
  }
}
