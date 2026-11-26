import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { lookupFilter } from "@/lib/ids";
import { Product } from "@/models/Product";
import { productDTO } from "@/lib/serialize";

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().max(1000).optional(),
    active: z.boolean().optional(),
  })
  .strict();

export async function GET(
  _request: Request,
  context: RouteContext<"/api/products/[id]">,
) {
  try {
    const { id } = await context.params;
    await connectDB();
    const product = await Product.findOne(lookupFilter(id)).lean();
    if (!product) return fail("Product not found", 404);
    return ok({ product: productDTO(product) });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/products/[id]">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);

    const { id } = await context.params;
    const body = patchSchema.parse(await readJson(request));
    await connectDB();
    const product = await Product.findOneAndUpdate(lookupFilter(id), body, {
      returnDocument: "after",
      runValidators: true,
    }).lean();
    if (!product) return fail("Product not found", 404);
    return ok({ product: productDTO(product) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/products/[id]">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);

    const { id } = await context.params;
    await connectDB();
    const product = await Product.findOneAndUpdate(
      lookupFilter(id),
      { $set: { active: false } },
      { returnDocument: "after" },
    ).lean();
    if (!product) return fail("Product not found", 404);
    return ok({ product: productDTO(product) });
  } catch (error) {
    return handleError(error);
  }
}
