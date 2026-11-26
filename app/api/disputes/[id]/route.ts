import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { lookupFilter } from "@/lib/ids";
import { Dispute } from "@/models/Dispute";
import { disputeDTO } from "@/lib/serialize";

const patchSchema = z
  .object({
    status: z.enum(["open", "won", "lost", "closed"]).optional(),
    evidence: z.string().max(2000).optional(),
  })
  .strict();

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/disputes/[id]">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);

    const { id } = await context.params;
    const body = patchSchema.parse(await readJson(request));
    await connectDB();
    const dispute = await Dispute.findOneAndUpdate(lookupFilter(id), body, {
      returnDocument: "after",
      runValidators: true,
    }).lean();
    if (!dispute) return fail("Dispute not found", 404);
    return ok({ dispute: disputeDTO(dispute) });
  } catch (error) {
    return handleError(error);
  }
}
