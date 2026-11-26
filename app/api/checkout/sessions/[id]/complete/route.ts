import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { lookupFilter, makePid } from "@/lib/ids";
import { CheckoutSession } from "@/models/CheckoutSession";
import { Price } from "@/models/Price";
import { Subscription } from "@/models/Subscription";
import { getGateway } from "@/lib/payments/adapter";
import { addLedgerEntry } from "@/lib/ledger";
import { createInvoice } from "@/lib/billing";
import { checkoutDTO, invoiceDTO, subscriptionDTO } from "@/lib/serialize";

const schema = z.object({
  outcome: z.enum(["success", "failure"]).optional(),
});

export async function POST(
  request: Request,
  context: RouteContext<"/api/checkout/sessions/[id]/complete">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);

    const { id } = await context.params;
    const body = schema.parse(await readJson(request).catch(() => ({})));
    await connectDB();

    const checkoutSession = await CheckoutSession.findOne(lookupFilter(id)).lean();
    if (!checkoutSession) return fail("Checkout session not found", 404);
    if (checkoutSession.status !== "open") {
      return fail("Checkout session is no longer open", 409);
    }
    if (new Date(checkoutSession.expiresAt).getTime() < Date.now()) {
      await CheckoutSession.updateOne(
        { _id: checkoutSession._id },
        { $set: { status: "expired" } },
      );
      return fail("Checkout session has expired", 409);
    }

    const outcome = body.outcome ?? checkoutSession.outcome;
    const price = await Price.findById(checkoutSession.price).lean();
    if (!price) return fail("Price not found", 404);

    if (outcome === "failure") {
      const failed = await CheckoutSession.findByIdAndUpdate(
        checkoutSession._id,
        { $set: { status: "failed", completedAt: new Date() } },
        { returnDocument: "after" },
      )
        .populate("customer", "name")
        .populate("price", "unitAmountMinor currency")
        .lean();
      return ok({ checkoutSession: checkoutDTO(failed!), invoice: null, subscription: null });
    }

    const charge = await getGateway().charge({
      amountMinor: checkoutSession.amountMinor,
      currency: checkoutSession.currency,
      sourceRef: checkoutSession.pid,
      description: `Checkout ${checkoutSession.pid}`,
      outcome: "success",
    });

    let subscription = null;
    if (checkoutSession.mode === "subscription") {
      const now = new Date();
      const days = price.interval === "year" ? 365 : 30;
      subscription = await Subscription.create({
        pid: makePid("sub"),
        customer: checkoutSession.customer,
        price: price._id,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + days * 86_400_000),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEnd: null,
      });
    }

    const invoice = await createInvoice({
      customerId: checkoutSession.customer,
      subscriptionId: subscription?._id ?? null,
      lines: [
        {
          description: `${price.pid} — ${checkoutSession.mode === "subscription" ? "first billing cycle" : "one-time purchase"}`,
          quantity: 1,
          unitAmountMinor: checkoutSession.amountMinor,
        },
      ],
      currency: checkoutSession.currency,
      status: "paid",
      paid: true,
    });

    await addLedgerEntry({
      kind: "charge",
      amountMinor: invoice.amountMinor,
      currency: invoice.currency,
      sourceRef: charge.chargeRef,
      description: `Checkout payment for ${checkoutSession.pid}`,
    });
    await addLedgerEntry({
      kind: "fee",
      amountMinor: -Math.round(invoice.amountMinor * 0.029) - 30,
      currency: invoice.currency,
      sourceRef: `fee_${charge.chargeRef}`,
      description: "Processing fee (2.9% + 30¢)",
    });

    const completed = await CheckoutSession.findByIdAndUpdate(
      checkoutSession._id,
      { $set: { status: "complete", completedAt: new Date() } },
      { returnDocument: "after" },
    )
      .populate("customer", "name")
      .populate("price", "unitAmountMinor currency")
      .lean();

    return ok({
      checkoutSession: checkoutDTO(completed!),
      invoice: invoiceDTO(invoice),
      subscription: subscription ? subscriptionDTO(subscription) : null,
      charge,
    });
  } catch (error) {
    return handleError(error);
  }
}
