import { getSession } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { lookupFilter } from "@/lib/ids";
import { Payout } from "@/models/Payout";
import { addLedgerEntry } from "@/lib/ledger";
import { payoutDTO } from "@/lib/serialize";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/payouts/[id]/pay">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);

    const { id } = await context.params;
    await connectDB();
    const payout = await Payout.findOne(lookupFilter(id)).lean();
    if (!payout) return fail("Payout not found", 404);
    if (payout.status === "paid") return fail("Payout is already paid", 409);

    const updated = await Payout.findByIdAndUpdate(
      payout._id,
      { $set: { status: "paid", paidAt: new Date() } },
      { returnDocument: "after" },
    ).lean();

    await addLedgerEntry({
      kind: "payout",
      amountMinor: -payout.amountMinor,
      currency: payout.currency,
      sourceRef: payout.pid,
      description: `Payout to ${payout.destination}`,
    });

    return ok({ payout: payoutDTO(updated!) });
  } catch (error) {
    return handleError(error);
  }
}
