import { connectDB } from "@/lib/db";
import { lookupFilter } from "@/lib/ids";
import { Invoice } from "@/models/Invoice";
import { invoiceDTO } from "@/lib/serialize";
import { formatMoney } from "@/lib/money";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(
  _request: Request,
  context: RouteContext<"/api/invoices/[id]/html">,
) {
  try {
    const { id } = await context.params;
    await connectDB();
    const doc = await Invoice.findOne(lookupFilter(id))
      .populate("customer", "name email")
      .lean();
    if (!doc) {
      return new Response("Invoice not found", { status: 404, headers: { "Content-Type": "text/plain" } });
    }
    const invoice = invoiceDTO(doc);
    const customer =
      doc.customer && typeof doc.customer === "object" && "name" in doc.customer
        ? {
            name: String((doc.customer as { name?: unknown }).name ?? ""),
            email: String((doc.customer as { email?: unknown }).email ?? ""),
          }
        : { name: "", email: "" };

    const lines = invoice.lines
      .map(
        (line) =>
          `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e5e1">${escapeHtml(line.description)}</td>` +
          `<td style="padding:10px 0;text-align:right;border-bottom:1px solid #e2e5e1">${line.quantity}</td>` +
          `<td style="padding:10px 0;text-align:right;border-bottom:1px solid #e2e5e1">${formatMoney(line.unitAmountMinor, invoice.currency)}</td>` +
          `<td style="padding:10px 0;text-align:right;border-bottom:1px solid #e2e5e1">${formatMoney(line.amountMinor, invoice.currency)}</td></tr>`,
      )
      .join("");

    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(invoice.number)}</title></head>
<body style="margin:0;background:#faf9f6;color:#14212b;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
<main style="max-width:720px;margin:40px auto;background:#fff;border:1px solid #e2e5e1;border-radius:12px;padding:40px">
<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0d7d74;padding-bottom:20px">
<div><p style="margin:0;font-size:20px;font-weight:700;letter-spacing:-.02em">Ledgerline</p><p style="margin:4px 0 0;color:#52616d;font-size:12px">Payments workspace</p></div>
<div style="text-align:right"><p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#52616d">Invoice</p><p style="margin:4px 0 0;font-size:18px;font-weight:600">${escapeHtml(invoice.number)}</p><p style="margin:4px 0 0;color:#52616d;font-size:12px">Status: ${escapeHtml(invoice.status)}</p></div>
</div>
<div style="display:flex;justify-content:space-between;gap:24px;margin:24px 0">
<div><p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#52616d">Billed to</p><p style="margin:6px 0 0;font-weight:600">${escapeHtml(customer.name)}</p><p style="margin:4px 0 0;color:#52616d;font-size:13px">${escapeHtml(customer.email)}</p></div>
<div style="text-align:right"><p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#52616d">Issued</p><p style="margin:6px 0 0">${new Date(invoice.createdAt).toLocaleDateString("en-US")}</p></div>
</div>
<table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr><th style="text-align:left;padding:8px 0;color:#52616d;font-size:11px;text-transform:uppercase;letter-spacing:.1em">Description</th><th style="text-align:right;padding:8px 0;color:#52616d;font-size:11px">Qty</th><th style="text-align:right;padding:8px 0;color:#52616d;font-size:11px">Unit</th><th style="text-align:right;padding:8px 0;color:#52616d;font-size:11px">Amount</th></tr></thead><tbody>${lines}</tbody></table>
<div style="margin-top:20px;margin-left:auto;max-width:260px;font-size:14px"><div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:#52616d">Subtotal</span><span>${formatMoney(invoice.subtotalMinor, invoice.currency)}</span></div><div style="display:flex;justify-content:space-between;padding:4px 0"><span style="color:#52616d">Tax</span><span>${formatMoney(invoice.taxMinor, invoice.currency)}</span></div><div style="display:flex;justify-content:space-between;padding:12px 0;border-top:2px solid #14212b;font-weight:700"><span>Total</span><span>${formatMoney(invoice.amountMinor, invoice.currency)}</span></div></div>
<p style="margin-top:32px;border-top:1px solid #e2e5e1;padding-top:16px;color:#52616d;font-size:11px">Reference implementation — this invoice was generated locally and does not represent a real charge.</p>
</main></body></html>`;

    return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (error) {
    console.error("[invoice-html] unexpected error:", error);
    return new Response("Unable to render invoice", { status: 500 });
  }
}
