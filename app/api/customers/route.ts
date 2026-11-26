import { z } from "zod";
import { getSession } from "@/lib/auth";
import { escapeRegex, fail, handleError, ok, parsePage, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { CURRENCIES } from "@/lib/money";
import { makePid } from "@/lib/ids";
import { Customer } from "@/models/Customer";
import { customerDTO } from "@/lib/serialize";

const createSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  description: z.string().max(1000).optional().default(""),
  currency: z.enum(CURRENCIES).optional().default("usd"),
  metadata: z.record(z.string(), z.string()).optional().default({}),
});

export async function GET(request: Request) {
  try {
    await connectDB();
    const query = parsePage(new URL(request.url).searchParams);
    const filter: Record<string, unknown> = {};
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), "i");
      filter.$or = [{ name: regex }, { email: regex }, { pid: regex }];
    }
    const sort: Record<string, 1 | -1> =
      query.sort === "name"
        ? { name: 1 }
        : query.sort === "balance"
          ? { balanceMinor: -1 }
          : { createdAt: -1 };

    const [docs, total] = await Promise.all([
      Customer.find(filter)
        .sort(sort)
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Customer.countDocuments(filter),
    ]);

    return ok({
      customers: docs.map((doc) => customerDTO(doc)),
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

    if (await Customer.exists({ email: body.email })) {
      return fail("A customer with that email already exists", 409);
    }

    const customer = await Customer.create({
      ...body,
      pid: makePid("cust"),
      balanceMinor: 0,
    });

    return ok({ customer: customerDTO(customer) }, 201);
  } catch (error) {
    return handleError(error);
  }
}
