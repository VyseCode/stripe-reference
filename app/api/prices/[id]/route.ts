import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { lookupFilter } from "@/lib/ids";
import { Price } from "@/models/Price";
import { priceDTO } from "@/lib/serialize";

const patchSchema = z
  .object({
    active: z.boolean().optional(),
    unitAmountMinor: z.number().int().min(0).optional(),
  })
  .strict();

export async function GET(
  _request: Request,
  context: RouteContext<"/api/prices/[id]">,
) {
  try {
    const { id } = await context.params;
    await connectDB();
    const price = await Price.findOne(lookupFilter(id)).populate("product", "name").lean();
    if (!price) return fail("Price not found", 404);
    return ok({ price: priceDTO(price) });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/prices/[id]">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);

    const { id } = await context.params;
    const body = patchSchema.parse(await readJson(request));
    await connectDB();
    const price = await Price.findOneAndUpdate(lookupFilter(id), body, {
      returnDocument: "after",
      runValidators: true,
    })
      .populate("product", "name")
      .lean();
    if (!price) return fail("Price not found", 404);
    return ok({ price: priceDTO(price) });
  } catch (error) {
    return handleError(error);
  }
}
