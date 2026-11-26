import { z } from "zod";
import { getSession } from "@/lib/auth";
import { escapeRegex, fail, handleError, ok, parsePage, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { lookupFilter, makePid } from "@/lib/ids";
import { Invoice } from "@/models/Invoice";
import { Dispute } from "@/models/Dispute";
import { disputeDTO } from "@/lib/serialize";

const createSchema = z.object({
  invoice: z.string().trim().min(1, "Choose an invoice"),
  amountMinor: z.number().int().min(1),
  reason: z
    .enum(["product_not_received", "duplicate", "unrecognized", "fraudulent"])
    .optional()
    .default("product_not_received"),
});

export async function GET(request: Request) {
  try {
    await connectDB();
    const query = parsePage(new URL(request.url).searchParams);
    const filter: Record<string, unknown> = {};
    if (["open", "won", "lost", "closed"].includes(query.status)) filter.status = query.status;
    if (query.search) filter.chargeRef = new RegExp(escapeRegex(query.search), "i");
    const [docs, total] = await Promise.all([
      Dispute.find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Dispute.countDocuments(filter),
    ]);
    return ok({ disputes: docs.map((doc) => disputeDTO(doc)), total, page: query.page, limit: query.limit });
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
    const invoice = await Invoice.findOne(lookupFilter(body.invoice)).lean();
    if (!invoice) return fail("Invoice not found", 404);
    if (body.amountMinor > invoice.amountMinor) {
      return fail("Dispute amount cannot exceed the original charge", 400);
    }

    const dispute = await Dispute.create({
      pid: makePid("dp"),
      chargeRef: `ch_${invoice.pid}`,
      amountMinor: body.amountMinor,
      currency: invoice.currency,
      reason: body.reason,
      status: "open",
      evidence: "",
    });
    return ok({ dispute: disputeDTO(dispute) }, 201);
  } catch (error) {
    return handleError(error);
  }
}
