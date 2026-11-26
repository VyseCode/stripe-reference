import { fail, handleError, ok } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { lookupFilter } from "@/lib/ids";
import { Customer } from "@/models/Customer";
import { PaymentMethod } from "@/models/PaymentMethod";
import { paymentMethodDTO } from "@/lib/serialize";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/customers/[id]/payment-methods">,
) {
  try {
    const { id } = await context.params;
    await connectDB();
    const customer = await Customer.findOne(lookupFilter(id)).select("_id").lean();
    if (!customer) return fail("Customer not found", 404);

    const docs = await PaymentMethod.find({ customer: customer._id })
      .sort({ isDefault: -1, createdAt: -1 })
      .limit(100)
      .lean();

    return ok({ paymentMethods: docs.map((doc) => paymentMethodDTO(doc)) });
  } catch (error) {
    return handleError(error);
  }
}
