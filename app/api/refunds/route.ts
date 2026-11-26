import { z } from "zod";
import { getSession } from "@/lib/auth";
import { escapeRegex, fail, handleError, ok, parsePage, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { lookupFilter, makePid } from "@/lib/ids";
import { Invoice } from "@/models/Invoice";
import { Refund } from "@/models/Refund";
import { getGateway } from "@/lib/payments/adapter";
import { addLedgerEntry } from "@/lib/ledger";
import { refundDTO } from "@/lib/serialize";

const createSchema = z.object({
  invoice: z.string().trim().min(1, "Choose an invoice"),
  amountMinor: z.number().int().min(1, "Refund amount must be positive"),
  reason: z
    .enum(["requested_by_customer", "duplicate", "fraudulent"])
    .optional()
    .default("requested_by_customer"),
});

export async function GET(request: Request) {
  try {
    await connectDB();
    const query = parsePage(new URL(request.url).searchParams);
    const filter: Record<string, unknown> = {};
    if (["pending", "succeeded", "failed"].includes(query.status)) filter.status = query.status;
    if (query.search) {
      filter.$or = [
        { pid: new RegExp(escapeRegex(query.search), "i") },
        { chargeRef: new RegExp(escapeRegex(query.search), "i") },
      ];
    }
    const [docs, total] = await Promise.all([
      Refund.find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Refund.countDocuments(filter),
    ]);
    return ok({ refunds: docs.map((doc) => refundDTO(doc)), total, page: query.page, limit: query.limit });
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
    if (invoice.status === "void") return fail("Cannot refund a void invoice", 409);

    const chargeRef = `ch_${invoice.pid}`;
    const prior = await Refund.aggregate([
      {
        $match: {
          chargeRef,
          status: { $in: ["succeeded", "pending"] },
        },
      },
      { $group: { _id: null, total: { $sum: "$amountMinor" } } },
    ]);
    const alreadyRefunded = prior[0]?.total ?? 0;
    if (alreadyRefunded + body.amountMinor > invoice.amountMinor) {
      return fail(
        `Refund of ${body.amountMinor} would exceed the charge (${alreadyRefunded} already refunded of ${invoice.amountMinor})`,
        400,
      );
    }

    const result = await getGateway().refund({
      amountMinor: body.amountMinor,
      currency: invoice.currency,
      chargeRef,
    });

    const refund = await Refund.create({
      pid: makePid("re"),
      chargeRef,
      sourceRef: invoice.pid,
      sourceAmountMinor: invoice.amountMinor,
      amountMinor: body.amountMinor,
      currency: invoice.currency,
      reason: body.reason,
      status: result.ok ? "succeeded" : "failed",
    });

    if (result.ok) {
      await addLedgerEntry({
        kind: "refund",
        amountMinor: -body.amountMinor,
        currency: invoice.currency,
        sourceRef: refund.pid,
        description: `Refund for ${invoice.number}`,
      });
    }

    return ok({ refund: refundDTO(refund), gatewayRef: result.refundRef }, 201);
  } catch (error) {
    return handleError(error);
  }
}
