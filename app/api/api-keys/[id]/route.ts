import { getSession } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { lookupFilter } from "@/lib/ids";
import { ApiKey } from "@/models/ApiKey";
import { apiKeyDTO } from "@/lib/serialize";

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/api-keys/[id]">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);

    const { id } = await context.params;
    await connectDB();
    const existing = await ApiKey.findOne(lookupFilter(id)).lean();
    if (!existing) return fail("API key not found", 404);
    if (existing.revokedAt) return fail("API key is already revoked", 409);

    const key = await ApiKey.updateOne(
      { _id: existing._id },
      { $set: { revokedAt: new Date() } },
    );
    if (key.matchedCount === 0) return fail("API key not found", 404);

    const updated = await ApiKey.findById(existing._id).lean();
    return ok({ apiKey: apiKeyDTO(updated!) });
  } catch (error) {
    return handleError(error);
  }
}
