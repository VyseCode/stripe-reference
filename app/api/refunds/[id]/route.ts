import { fail, handleError, ok } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { lookupFilter } from "@/lib/ids";
import { Refund } from "@/models/Refund";
import { refundDTO } from "@/lib/serialize";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/refunds/[id]">,
) {
  try {
    const { id } = await context.params;
    await connectDB();
    const refund = await Refund.findOne(lookupFilter(id)).lean();
    if (!refund) return fail("Refund not found", 404);
    return ok({ refund: refundDTO(refund) });
  } catch (error) {
    return handleError(error);
  }
}
