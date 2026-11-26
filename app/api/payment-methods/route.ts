import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok, parsePage, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { lookupFilter, makePid } from "@/lib/ids";
import { Customer } from "@/models/Customer";
import { PaymentMethod } from "@/models/PaymentMethod";
import { paymentMethodDTO } from "@/lib/serialize";

export const paymentMethodSchema = z.object({
  customer: z.string().trim().min(1, "Choose a customer"),
  brand: z.enum(["visa", "mastercard", "amex"]),
  last4: z.string().regex(/^\d{4}$/, "Last four digits must be 4 digits"),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(2024).max(2100),
  isDefault: z.boolean().optional().default(false),
});

export async function GET(request: Request) {
  try {
    await connectDB();
    const params = new URL(request.url).searchParams;
    const query = parsePage(params);
    const filter: Record<string, unknown> = {};
    const customerKey = (params.get("customer") ?? "").trim();
    if (customerKey) {
      const customer = await Customer.findOne(lookupFilter(customerKey)).select("_id").lean();
      if (!customer) {
        return ok({ paymentMethods: [], total: 0, page: query.page, limit: query.limit });
      }
      filter.customer = customer._id;
    }

    const [docs, total] = await Promise.all([
      PaymentMethod.find(filter)
        .populate("customer", "name")
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      PaymentMethod.countDocuments(filter),
    ]);

    return ok({
      paymentMethods: docs.map((doc) => paymentMethodDTO(doc)),
      total,
      page: query.page,
      limit: query.limit,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("You must be signed in", 401);

    const body = paymentMethodSchema.parse(await readJson(request));
    await connectDB();
    const customer = await Customer.findOne(lookupFilter(body.customer)).lean();
    if (!customer) return fail("Customer not found", 404);

    const token = `pm_tok_${Math.random().toString(16).slice(2, 14)}`;
    const existingDefaults = await PaymentMethod.countDocuments({
      customer: customer._id,
      isDefault: true,
    });
    const isDefault = body.isDefault || existingDefaults === 0;
    if (isDefault) {
      await PaymentMethod.updateMany(
        { customer: customer._id, isDefault: true },
        { $set: { isDefault: false } },
      );
    }

    const method = await PaymentMethod.create({
      pid: makePid("pm"),
      token,
      customer: customer._id,
      type: "card",
      brand: body.brand,
      last4: body.last4,
      expMonth: body.expMonth,
      expYear: body.expYear,
      isDefault,
    });

    return ok(
      {
        paymentMethod: {
          ...paymentMethodDTO(method),
          token,
          customerId: customer._id.toString(),
        },
      },
      201,
    );
  } catch (error) {
    return handleError(error);
  }
}
