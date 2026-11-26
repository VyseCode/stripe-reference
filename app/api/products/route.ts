import { z } from "zod";
import { getSession } from "@/lib/auth";
import { escapeRegex, fail, handleError, ok, parsePage, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { makePid } from "@/lib/ids";
import { Product } from "@/models/Product";
import { productDTO } from "@/lib/serialize";

const createSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  description: z.string().max(1000).optional().default(""),
  active: z.boolean().optional().default(true),
});

export async function GET(request: Request) {
  try {
    await connectDB();
    const query = parsePage(new URL(request.url).searchParams);
    const filter: Record<string, unknown> = {};
    if (query.search) {
      filter.name = new RegExp(escapeRegex(query.search), "i");
    }
    if (query.status === "active" || query.status === "archived") {
      filter.active = query.status === "active";
    }

    const [docs, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return ok({
      products: docs.map((doc) => productDTO(doc)),
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
    const product = await Product.create({ ...body, pid: makePid("prod") });
    return ok({ product: productDTO(product) }, 201);
  } catch (error) {
    return handleError(error);
  }
}
