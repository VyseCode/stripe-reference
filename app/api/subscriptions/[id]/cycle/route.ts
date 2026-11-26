import { getSession } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { lookupFilter } from "@/lib/ids";
import { Price } from "@/models/Price";
import { Subscription } from "@/models/Subscription";
import { cycleInvoiceForSubscription } from "@/lib/billing";
import { invoiceDTO, subscriptionDTO } from "@/lib/serialize";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/subscriptions/[id]/cycle">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);

    const { id } = await context.params;
    await connectDB();
    const subscription = await Subscription.findOne(lookupFilter(id)).lean();
    if (!subscription) return fail("Subscription not found", 404);
    if (subscription.status === "canceled") return fail("Subscription is canceled", 409);
    if (subscription.status === "past_due") {
      return fail("Resolve the past-due payment before advancing the cycle", 409);
    }

    if (subscription.cancelAtPeriodEnd) {
      const canceled = await Subscription.findByIdAndUpdate(
        subscription._id,
        { $set: { status: "canceled", canceledAt: new Date() } },
        { returnDocument: "after" },
      )
        .populate("customer", "name")
        .populate("price", "unitAmountMinor interval currency")
        .lean();
      return ok({ subscription: subscriptionDTO(canceled!), invoice: null });
    }

    const price = await Price.findById(subscription.price).lean();
    const days = price?.interval === "year" ? 365 : 30;
    const invoice = await cycleInvoiceForSubscription(subscription._id);
    const advanced = await Subscription.findByIdAndUpdate(
      subscription._id,
      {
        $set: {
          currentPeriodStart: subscription.currentPeriodEnd,
          currentPeriodEnd: new Date(
            new Date(subscription.currentPeriodEnd).getTime() + days * 86_400_000,
          ),
        },
      },
      { returnDocument: "after" },
    )
      .populate("customer", "name")
      .populate("price", "unitAmountMinor interval currency")
      .lean();

    return ok({
      subscription: subscriptionDTO(advanced!),
      invoice: invoice ? invoiceDTO(invoice) : null,
    });
  } catch (error) {
    return handleError(error);
  }
}
