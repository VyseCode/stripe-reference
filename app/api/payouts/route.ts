import { z } from "zod";
import { getSession } from "@/lib/auth";
import { escapeRegex, fail, handleError, ok, parsePage, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { makePid } from "@/lib/ids";
import { Payout } from "@/models/Payout";
import { currentBalanceMinor } from "@/lib/ledger";
import { getGateway } from "@/lib/payments/adapter";
import { payoutDTO } from "@/lib/serialize";

const createSchema = z.object({
  amountMinor: z.number().int().min(1, "Payout amount must be positive"),
  destination: z.string().trim().min(2).max(120).optional().default("bank •• 4242"),
});

export async function GET(request: Request) {
  try {
    await connectDB();
    const query = parsePage(new URL(request.url).searchParams);
    const filter: Record<string, unknown> = {};
    if (["pending", "paid", "failed"].includes(query.status)) filter.status = query.status;
    if (query.search) filter.pid = new RegExp(escapeRegex(query.search), "i");
    const [docs, total] = await Promise.all([
      Payout.find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Payout.countDocuments(filter),
    ]);
    return ok({ payouts: docs.map((doc) => payoutDTO(doc)), total, page: query.page, limit: query.limit });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);

    const body = createSchema.parse(await readJson(request));
    await connectDB();

    const available = await currentBalanceMinor();
    const pending = await Payout.aggregate([
      { $match: { status: "pending" } },
      { $group: { _id: null, total: { $sum: "$amountMinor" } } },
    ]);
    const encumbered = pending[0]?.total ?? 0;
    if (body.amountMinor > available - encumbered) {
      return fail("Payout exceeds the available balance", 400);
    }

    await getGateway().payout({
      amountMinor: body.amountMinor,
      currency: "usd",
      destination: body.destination,
    });

    const payout = await Payout.create({
      pid: makePid("po"),
      amountMinor: body.amountMinor,
      currency: "usd",
      status: "pending",
      destination: body.destination,
      arrivalDate: new Date(Date.now() + 2 * 86_400_000),
      paidAt: null,
    });
    return ok({ payout: payoutDTO(payout) }, 201);
  } catch (error) {
    return handleError(error);
  }
}
