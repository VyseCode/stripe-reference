import { z } from "zod";
import { getSession } from "@/lib/auth";
import { fail, handleError, ok, parsePage, readJson } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Invoice } from "@/models/Invoice";
import { createInvoice, type InvoiceLineInput } from "@/lib/billing";
import { invoiceDTO } from "@/lib/serialize";
import { CURRENCIES } from "@/lib/money";
import { escapeRegex } from "@/lib/api";

const createSchema = z.object({
  customer: z.string().trim().min(1, "Choose a customer"),
  lines: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(200),
        quantity: z.number().int().min(1).max(1000),
        unitAmountMinor: z.number().int().min(0),
      }),
    )
    .min(1, "Add at least one line item")
    .max(50),
  currency: z.enum(CURRENCIES).optional().default("usd"),
  taxRateBps: z.number().int().min(0).max(10000).optional().default(0),
  status: z.enum(["draft", "open"]).optional().default("open"),
});

export async function GET(request: Request) {
  try {
    await connectDB();
    const query = parsePage(new URL(request.url).searchParams);
    const filter: Record<string, unknown> = {};
    if (["draft", "open", "paid", "void", "uncollectible"].includes(query.status)) {
      filter.status = query.status;
    }
    if (query.search) {
      filter.number = new RegExp(escapeRegex(query.search), "i");
    }
    const [docs, total] = await Promise.all([
      Invoice.find(filter)
        .populate("customer", "name")
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Invoice.countDocuments(filter),
    ]);
    return ok({
      invoices: docs.map((doc) => invoiceDTO(doc)),
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
    const customer = await Customer.findOne(
      /^[a-fA-F0-9]{24}$/.test(body.customer) ? { _id: body.customer } : { pid: body.customer },
    ).lean();
    if (!customer) return fail("Customer not found", 404);

    const invoice = await createInvoice({
      customerId: customer._id,
      lines: body.lines as InvoiceLineInput[],
      currency: body.currency,
      taxRateBps: body.taxRateBps,
      status: body.status,
      dueDate: new Date(Date.now() + 7 * 86_400_000),
    });
    return ok({ invoice: invoiceDTO(invoice) }, 201);
  } catch (error) {
    return handleError(error);
  }
}
