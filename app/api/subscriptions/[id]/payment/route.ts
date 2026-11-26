import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { lookupFilter } from "@/lib/ids";
import { Invoice } from "@/models/Invoice";
import { Subscription } from "@/models/Subscription";
import { getGateway } from "@/lib/payments/adapter";
import { addLedgerEntry } from "@/lib/ledger";
import { invoiceDTO, subscriptionDTO } from "@/lib/serialize";

const schema = z.object({
  outcome: z.enum(["success", "failure"]).optional().default("success"),
});

export async function POST(
  request: Request,
  context: RouteContext<"/api/subscriptions/[id]/payment">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);

    const { id } = await context.params;
    const body = schema.parse(await readJson(request).catch(() => ({})));
    await connectDB();

    const subscription = await Subscription.findOne(lookupFilter(id)).lean();
    if (!subscription) return fail("Subscription not found", 404);
    if (subscription.status === "canceled") return fail("Subscription is canceled", 409);

    const invoice = await Invoice.findOne({
      subscription: subscription._id,
      status: { $in: ["open", "uncollectible", "draft"] },
    })
      .sort({ createdAt: -1 })
      .lean();
    if (!invoice) return fail("No payable invoice for this subscription", 404);

    const charge = await getGateway().charge({
      amountMinor: invoice.amountMinor,
      currency: invoice.currency,
      sourceRef: invoice.pid,
      description: `Subscription payment for ${subscription.pid}`,
      outcome: body.outcome,
    });

    if (!charge.ok) {
      await Subscription.updateOne(
        { _id: subscription._id },
        { $set: { status: "past_due" } },
      );
      await Invoice.updateOne(
        { _id: invoice._id },
        { $set: { status: "uncollectible" } },
      );
      const failed = await Subscription.findById(subscription._id)
        .populate("customer", "name")
        .populate("price", "unitAmountMinor interval currency")
        .lean();
      const failedInvoice = await Invoice.findById(invoice._id).lean();
      return ok({
        subscription: subscriptionDTO(failed!),
        invoice: invoiceDTO(failedInvoice!),
        charge,
      });
    }

    await Subscription.updateOne({ _id: subscription._id }, { $set: { status: "active" } });
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

    const updated = await Subscription.findById(subscription._id)
      .populate("customer", "name")
      .populate("price", "unitAmountMinor interval currency")
      .lean();
    const paidInvoice = await Invoice.findById(invoice._id).lean();
    return ok({
      subscription: subscriptionDTO(updated!),
      invoice: invoiceDTO(paidInvoice!),
      charge,
    });
  } catch (error) {
    return handleError(error);
  }
}
