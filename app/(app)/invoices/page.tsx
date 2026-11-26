import Link from "next/link";
import { Suspense } from "react";
import { connectDB } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Invoice } from "@/models/Invoice";
import { invoiceDTO } from "@/lib/serialize";
import { formatMoney } from "@/lib/money";
import { NewInvoiceForm } from "@/components/ResourceForms";
import { TableSkeleton } from "@/components/Skeleton";
import { Card, EmptyState, PageHeader, StatusPill, TableHead } from "@/components/ui";

export const metadata = { title: "Invoices — Ledgerline" };

const FILTERS = ["all", "draft", "open", "paid", "void", "uncollectible"];

async function InvoiceTable({ status }: { status: string }) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (status !== "all") filter.status = status;
  const docs = await Invoice.find(filter)
    .populate("customer", "name")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  const invoices = docs.map((doc) => invoiceDTO(doc));
  if (invoices.length === 0) {
    return (
      <EmptyState
        title="No invoices in this view"
        description="Generate a cycle invoice, complete a checkout, or clear the status filter."
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <TableHead columns={["Invoice", "Customer", "Issued", "Amount", "Status", "View"]} />
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-b border-line last:border-0 hover:bg-paper/60">
              <td className="px-5 py-3.5">
                <p className="tnum font-medium text-ink">{invoice.number}</p>
                <p className="tnum mt-0.5 text-[11px] text-inksoft">{invoice.pid}</p>
              </td>
              <td className="px-5 py-3.5 text-inksoft">{invoice.customerName || "—"}</td>
              <td className="px-5 py-3.5 text-inksoft">
                {new Date(invoice.createdAt).toLocaleDateString()}
              </td>
              <td className="tnum px-5 py-3.5 font-medium text-ink">
                {formatMoney(invoice.amountMinor, invoice.currency)}
              </td>
              <td className="px-5 py-3.5"><StatusPill status={invoice.status} /></td>
              <td className="px-5 py-3.5">
                <Link href={`/invoices/${invoice.id}`} className="text-xs font-semibold text-accent hover:underline">
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function InvoicesPage({
  searchParams,
}: PageProps<"/invoices">) {
  const params = await searchParams;
  const requested = typeof params.status === "string" ? params.status : "all";
  const status = FILTERS.includes(requested) ? requested : "all";
  await connectDB();
  const customers = await Customer.find().sort({ name: 1 }).limit(100).select("name").lean();

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Invoices"
        description="Per-cycle invoices with line items, integer minor-unit amounts and an HTML view."
        action={
          <NewInvoiceForm
            customers={customers.map((customer) => ({
              id: customer._id.toString(),
              name: customer.name,
            }))}
          />
        }
      />
      <div className="mb-4 flex flex-wrap gap-2" aria-label="Filter invoices by status">
        {FILTERS.map((filter) => (
          <Link
            key={filter}
            href={`/invoices${filter === "all" ? "" : `?status=${filter}`}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              status === filter
                ? "border-accent bg-accent text-white"
                : "border-line bg-surface text-inksoft hover:text-ink"
            }`}
            aria-current={status === filter ? "page" : undefined}
          >
            {filter.replace("_", " ")}
          </Link>
        ))}
      </div>
      <Card>
        <Suspense fallback={<TableSkeleton />}>
          <InvoiceTable status={status} />
        </Suspense>
      </Card>
    </>
  );
}
