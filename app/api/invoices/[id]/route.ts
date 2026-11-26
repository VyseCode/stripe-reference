import { fail, handleError, ok } from "@/lib/api";
import { connectDB } from "@/lib/db";
import { lookupFilter } from "@/lib/ids";
import { Invoice } from "@/models/Invoice";
import { invoiceDTO } from "@/lib/serialize";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/invoices/[id]">,
) {
  try {
    const { id } = await context.params;
    await connectDB();
    const invoice = await Invoice.findOne(lookupFilter(id))
      .populate("customer", "name email")
      .lean();
    if (!invoice) return fail("Invoice not found", 404);
    return ok({ invoice: invoiceDTO(invoice) });
  } catch (error) {
    return handleError(error);
  }
}
