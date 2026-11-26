import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { lookupFilter } from "@/lib/ids";
import { Subscription } from "@/models/Subscription";
import { subscriptionDTO } from "@/lib/serialize";

const schema = z.object({
  atPeriodEnd: z.boolean().optional().default(true),
});

export async function POST(
  request: Request,
  context: RouteContext<"/api/subscriptions/[id]/cancel">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);

    const { id } = await context.params;
    const body = schema.parse(await readJson(request).catch(() => ({})));
    await connectDB();

    const subscription = await Subscription.findOne(lookupFilter(id)).lean();
    if (!subscription) return fail("Subscription not found", 404);
    if (subscription.status === "canceled") {
      return fail("Subscription is already canceled", 409);
    }

    const update = body.atPeriodEnd
      ? {
          $set: {
            cancelAtPeriodEnd: true,
            ...(subscription.status === "past_due" ? { status: "canceled" as const, canceledAt: new Date() } : {}),
          },
        }
      : { $set: { status: "canceled" as const, canceledAt: new Date(), cancelAtPeriodEnd: false } };

    const updated = await Subscription.findByIdAndUpdate(subscription._id, update, {
      returnDocument: "after",
    })
      .populate("customer", "name")
      .populate("price", "unitAmountMinor interval currency")
      .lean();

    return ok({ subscription: subscriptionDTO(updated!) });
  } catch (error) {
    return handleError(error);
  }
}
