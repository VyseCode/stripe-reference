import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { lookupFilter } from "@/lib/ids";
import { Invoice } from "@/models/Invoice";
import { getGateway } from "@/lib/payments/adapter";
import { addLedgerEntry } from "@/lib/ledger";
import { invoiceDTO } from "@/lib/serialize";

const schema = z.object({
  outcome: z.enum(["success", "failure"]).optional().default("success"),
});

export async function POST(
  request: Request,
  context: RouteContext<"/api/invoices/[id]/pay">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);

    const { id } = await context.params;
    const body = schema.parse(await readJson(request).catch(() => ({})));
    await connectDB();

    const invoice = await Invoice.findOne(lookupFilter(id)).lean();
    if (!invoice) return fail("Invoice not found", 404);
    if (invoice.status === "paid" || invoice.status === "void") {
      return fail(`Invoice is already ${invoice.status}`, 409);
    }
    if (invoice.amountMinor === 0) return fail("Invoice has no amount to collect", 400);

    const charge = await getGateway().charge({
      amountMinor: invoice.amountMinor,
      currency: invoice.currency,
      sourceRef: invoice.pid,
      description: `Payment for ${invoice.number}`,
      outcome: body.outcome,
    });

    if (!charge.ok) {
      await Invoice.updateOne({ _id: invoice._id }, { $set: { status: "uncollectible" } });
      const updated = await Invoice.findById(invoice._id).lean();
      return ok({ invoice: invoiceDTO(updated!), charge });
    }

    await Invoice.updateOne(
      { _id: invoice._id },
      { $set: { status: "paid", paidAt: new Date() } },
    );
    await addLedgerEntry({
      kind: "charge",
      amountMinor: invoice.amountMinor,
      currency: invoice.currency,
      sourceRef: charge.chargeRef,
      description: `Payment for ${invoice.number}`,
    });
    await addLedgerEntry({
      kind: "fee",
      amountMinor: -Math.round(invoice.amountMinor * 0.029) - 30,
      currency: invoice.currency,
      sourceRef: `fee_${charge.chargeRef}`,
      description: "Processing fee (2.9% + 30¢)",
    });

    const updated = await Invoice.findById(invoice._id).lean();
    return ok({ invoice: invoiceDTO(updated!), charge });
  } catch (error) {
    return handleError(error);
  }
}
