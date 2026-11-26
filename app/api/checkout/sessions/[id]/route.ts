import { fail, handleError, ok } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { lookupFilter } from "@/lib/ids";
import { CheckoutSession } from "@/models/CheckoutSession";
import { checkoutDTO } from "@/lib/serialize";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/checkout/sessions/[id]">,
) {
  try {
    const { id } = await context.params;
    await connectDB();
    const session = await CheckoutSession.findOne(lookupFilter(id))
      .populate("customer", "name")
      .populate("price", "unitAmountMinor currency")
      .lean();
    if (!session) return fail("Checkout session not found", 404);
    return ok({ checkoutSession: checkoutDTO(session) });
  } catch (error) {
    return handleError(error);
  }
}
