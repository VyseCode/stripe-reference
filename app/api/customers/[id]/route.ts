import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { CURRENCIES } from "@/lib/money";
import { lookupFilter } from "@/lib/ids";
import { Customer } from "@/models/Customer";
import { Subscription } from "@/models/Subscription";
import { customerDTO } from "@/lib/serialize";

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().max(1000).optional(),
    currency: z.enum(CURRENCIES).optional(),
    metadata: z.record(z.string(), z.string()).optional(),
  })
  .strict();

export async function GET(
  _request: Request,
  context: RouteContext<"/api/customers/[id]">,
) {
  try {
    const { id } = await context.params;
    await connectDB();
    const customer = await Customer.findOne(lookupFilter(id)).lean();
    if (!customer) return fail("Customer not found", 404);
    return ok({ customer: customerDTO(customer) });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/customers/[id]">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);

    const { id } = await context.params;
    const body = patchSchema.parse(await readJson(request));
    await connectDB();

    const customer = await Customer.findOneAndUpdate(lookupFilter(id), body, {
      returnDocument: "after",
      runValidators: true,
    }).lean();
    if (!customer) return fail("Customer not found", 404);
    return ok({ customer: customerDTO(customer) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/customers/[id]">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);

    const { id } = await context.params;
    await connectDB();
    const customer = await Customer.findOne(lookupFilter(id)).lean();
    if (!customer) return fail("Customer not found", 404);

    const active = await Subscription.countDocuments({
      customer: customer._id,
      status: { $in: ["trialing", "active", "past_due"] },
    });
    if (active > 0) {
      return fail("Cancel this customer's active subscriptions first", 409);
    }

    await Customer.deleteOne({ _id: customer._id });
    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
