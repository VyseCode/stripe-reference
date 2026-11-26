import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok, parsePage, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { CURRENCIES } from "@/lib/money";
import { lookupFilter, makePid } from "@/lib/ids";
import { Price } from "@/models/Price";
import { Product } from "@/models/Product";
import { priceDTO } from "@/lib/serialize";

const createSchema = z.object({
  product: z.string().trim().min(1, "Choose a product"),
  unitAmountMinor: z.number().int().min(0, "Amount cannot be negative"),
  currency: z.enum(CURRENCIES).optional().default("usd"),
  interval: z.enum(["one_time", "month", "year"]),
  active: z.boolean().optional().default(true),
});

export async function GET(request: Request) {
  try {
    await connectDB();
    const query = parsePage(new URL(request.url).searchParams);
    const filter: Record<string, unknown> = {};
    const productKey = query.search;
    if (productKey) {
      const product = await Product.findOne(lookupFilter(productKey)).select("_id").lean();
      if (!product) {
        return ok({ prices: [], total: 0, page: query.page, limit: query.limit });
      }
      filter.product = product._id;
    }
    if (query.status === "active" || query.status === "archived") {
      filter.active = query.status === "active";
    }
    if (query.status === "one_time" || query.status === "month" || query.status === "year") {
      filter.interval = query.status;
    }

    const [docs, total] = await Promise.all([
      Price.find(filter)
        .populate("product", "name")
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Price.countDocuments(filter),
    ]);

    return ok({
      prices: docs.map((doc) => priceDTO(doc)),
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
    const product = await Product.findOne(lookupFilter(body.product)).select("_id").lean();
    if (!product) return fail("Product not found", 404);

    const price = await Price.create({
      ...body,
      product: product._id,
      pid: makePid("price"),
    });
    return ok({ price: priceDTO(price) }, 201);
  } catch (error) {
    return handleError(error);
  }
}
