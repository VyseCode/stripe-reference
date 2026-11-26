import { fail, handleError, ok } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { lookupFilter } from "@/lib/ids";
import { Subscription } from "@/models/Subscription";
import { subscriptionDTO } from "@/lib/serialize";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/subscriptions/[id]">,
) {
  try {
    const { id } = await context.params;
    await connectDB();
    const subscription = await Subscription.findOne(lookupFilter(id))
      .populate("customer", "name")
      .populate("price", "unitAmountMinor interval currency")
      .lean();
    if (!subscription) return fail("Subscription not found", 404);
    return ok({ subscription: subscriptionDTO(subscription) });
  } catch (error) {
    return handleError(error);
  }
}
