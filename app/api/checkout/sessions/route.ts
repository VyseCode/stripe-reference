import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok, parsePage, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { lookupFilter, makePid } from "@/lib/ids";
import { Customer } from "@/models/Customer";
import { Price } from "@/models/Price";
import { CheckoutSession } from "@/models/CheckoutSession";
import { checkoutDTO } from "@/lib/serialize";

const createSchema = z.object({
  customer: z.string().trim().min(1, "Choose a customer"),
  price: z.string().trim().min(1, "Choose a price"),
  outcome: z.enum(["success", "failure"]).optional().default("success"),
  successUrl: z.string().max(200).optional().default("/checkout"),
  cancelUrl: z.string().max(200).optional().default("/checkout"),
});

export async function GET(request: Request) {
  try {
    await connectDB();
    const query = parsePage(new URL(request.url).searchParams);
    const filter: Record<string, unknown> = {};
    if (["open", "complete", "failed", "expired"].includes(query.status)) {
      filter.status = query.status;
    }
    const [docs, total] = await Promise.all([
      CheckoutSession.find(filter)
        .populate("customer", "name")
        .populate("price", "unitAmountMinor currency")
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      CheckoutSession.countDocuments(filter),
    ]);
    return ok({
      checkoutSessions: docs.map((doc) => checkoutDTO(doc)),
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

    const body = createSchema.parse(await readJson(request));
    await connectDB();
    const customer = await Customer.findOne(lookupFilter(body.customer)).select("_id currency").lean();
    if (!customer) return fail("Customer not found", 404);
    const price = await Price.findOne(lookupFilter(body.price)).lean();
    if (!price) return fail("Price not found", 404);
    if (!price.active) return fail("That price is archived", 409);

    const checkoutSession = await CheckoutSession.create({
      pid: makePid("cs"),
      customer: customer._id,
      price: price._id,
      mode: price.interval === "one_time" ? "payment" : "subscription",
      status: "open",
      amountMinor: price.unitAmountMinor,
      currency: price.currency,
      outcome: body.outcome,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
      expiresAt: new Date(Date.now() + 86_400_000),
      completedAt: null,
    });

    return ok({ checkoutSession: checkoutDTO(checkoutSession) }, 201);
  } catch (error) {
    return handleError(error);
  }
}
