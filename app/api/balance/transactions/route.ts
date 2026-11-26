import { handleError, ok, parsePage } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { LedgerEntry } from "@/models/LedgerEntry";
import { ledgerDTO } from "@/lib/serialize";

const KINDS = ["charge", "refund", "fee", "payout", "dispute"];

export async function GET(request: Request) {
  try {
    await connectDB();
    const query = parsePage(new URL(request.url).searchParams);
    const filter: Record<string, unknown> = {};
    if (KINDS.includes(query.status)) filter.kind = query.status;

    const [docs, total] = await Promise.all([
      LedgerEntry.find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      LedgerEntry.countDocuments(filter),
    ]);
    return ok({
      transactions: docs.map((doc) => ledgerDTO(doc)),
      total,
      page: query.page,
      limit: query.limit,
    });
  } catch (error) {
    return handleError(error);
  }
}
