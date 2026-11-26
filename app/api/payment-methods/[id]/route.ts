import { getSession } from "@/lib/auth";
import { fail, handleError, ok } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { lookupFilter } from "@/lib/ids";
import { PaymentMethod } from "@/models/PaymentMethod";
import { paymentMethodDTO } from "@/lib/serialize";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/payment-methods/[id]">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);

    const { id } = await context.params;
    const body = (await request.json()) as { isDefault?: boolean };
    if (body.isDefault !== true) return fail("Only setting a default is supported", 400);

    await connectDB();
    const method = await PaymentMethod.findOne(lookupFilter(id)).lean();
    if (!method) return fail("Payment method not found", 404);

    await PaymentMethod.updateMany(
      { customer: method.customer, isDefault: true },
      { $set: { isDefault: false } },
    );
    const updated = await PaymentMethod.findByIdAndUpdate(
      method._id,
      { $set: { isDefault: true } },
      { returnDocument: "after" },
    ).lean();

    return ok({ paymentMethod: paymentMethodDTO(updated!) });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/payment-methods/[id]">,
) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);

    const { id } = await context.params;
    await connectDB();
    const method = await PaymentMethod.findOneAndDelete(lookupFilter(id)).lean();
    if (!method) return fail("Payment method not found", 404);

    if (method.isDefault) {
      const replacement = await PaymentMethod.findOne({ customer: method.customer })
        .sort({ createdAt: -1 })
        .lean();
      if (replacement) {
        await PaymentMethod.updateOne(
          { _id: replacement._id },
          { $set: { isDefault: true } },
        );
      }
    }

    return ok({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
