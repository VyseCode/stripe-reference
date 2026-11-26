import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok, parsePage, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { lookupFilter, makePid } from "@/lib/ids";
import { Customer } from "@/models/Customer";
import { Price } from "@/models/Price";
import { Subscription } from "@/models/Subscription";
import { subscriptionDTO } from "@/lib/serialize";

const createSchema = z.object({
  customer: z.string().trim().min(1, "Choose a customer"),
  price: z.string().trim().min(1, "Choose a price"),
  status: z.enum(["trialing", "active"]).optional().default("active"),
  trialDays: z.number().int().min(1).max(365).optional().default(14),
});

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export async function GET(request: Request) {
  try {
    await connectDB();
    const params = new URL(request.url).searchParams;
    const query = parsePage(params);
    const filter: Record<string, unknown> = {};
    if (query.status && ["trialing", "active", "past_due", "canceled"].includes(query.status)) {
      filter.status = query.status;
    }
    const customerKey = (params.get("customer") ?? "").trim();
    if (customerKey) {
      const customer = await Customer.findOne(lookupFilter(customerKey)).select("_id").lean();
      if (!customer) {
        return ok({ subscriptions: [], total: 0, page: query.page, limit: query.limit });
      }
      filter.customer = customer._id;
    }

    const sort: Record<string, 1 | -1> =
      query.sort === "customer" ? { customer: 1 } : { createdAt: -1 };
    const [docs, total] = await Promise.all([
      Subscription.find(filter)
        .populate("customer", "name")
        .populate("price", "unitAmountMinor interval currency")
        .sort(sort)
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Subscription.countDocuments(filter),
    ]);

    return ok({
      subscriptions: docs.map((doc) => subscriptionDTO(doc)),
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

    const customer = await Customer.findOne(lookupFilter(body.customer)).select("_id").lean();
    if (!customer) return fail("Customer not found", 404);
    const price = await Price.findOne(lookupFilter(body.price)).lean();
    if (!price) return fail("Price not found", 404);
    if (!price.active) return fail("That price is archived", 409);
    if (price.interval === "one_time") {
      return fail("Subscriptions require a recurring price", 400);
    }

    const existing = await Subscription.countDocuments({
      customer: customer._id,
      price: price._id,
      status: { $in: ["trialing", "active", "past_due"] },
    });
    if (existing > 0) {
      return fail("This customer already has an active subscription on that price", 409);
    }

    const now = new Date();
    const durationDays = price.interval === "year" ? 365 : 30;
    const subscription = await Subscription.create({
      pid: makePid("sub"),
      customer: customer._id,
      price: price._id,
      status: body.status,
      currentPeriodStart: now,
      currentPeriodEnd: addDays(now, durationDays),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      trialEnd: body.status === "trialing" ? addDays(now, body.trialDays) : null,
    });

    return ok({ subscription: subscriptionDTO(subscription) }, 201);
  } catch (error) {
    return handleError(error);
  }
}
