import Link from "next/link";
import { Suspense } from "react";
import { connectDB } from "@/lib/db";
import { escapeRegex } from "@/lib/api";
import { Customer } from "@/models/Customer";
import { customerDTO } from "@/lib/serialize";
import { formatMoney } from "@/lib/money";
import { NewCustomerForm } from "@/components/ResourceForms";
import { SearchIcon } from "@/components/Icons";
import { TableSkeleton } from "@/components/Skeleton";
import {
  Card,
  EmptyState,
  PageHeader,
  Pagination,
  StatusPill,
  TableHead,
} from "@/components/ui";

export const metadata = { title: "Customers — Ledgerline" };

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.trunc(n), 10000) : 1;
}

async function CustomerTable({
  page,
  search,
  limit,
}: {
  page: number;
  search: string;
  limit: number;
}) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: regex }, { email: regex }, { pid: regex }];
  }
  const [docs, total] = await Promise.all([
    Customer.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Customer.countDocuments(filter),
  ]);
  const customers = docs.map((doc) => customerDTO(doc));

  return (
    <>
      {customers.length === 0 ? (
        <EmptyState
          title={search ? "No customers match that search" : "No customers yet"}
          description={
            search
              ? "Try a different name, email or customer ID."
              : "Add your first customer to start billing and tracking payments."
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <TableHead columns={["Customer", "Email", "Currency", "Balance", "Added"]} />
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-line last:border-0 hover:bg-paper/60">
                  <td className="px-5 py-3.5">
                    <Link href={`/customers/${customer.id}`} className="font-medium text-ink hover:text-accent hover:underline">
                      {customer.name}
                    </Link>
                    <p className="tnum mt-0.5 text-[11px] text-inksoft">{customer.pid}</p>
                  </td>
                  <td className="px-5 py-3.5 text-inksoft">{customer.email}</td>
                  <td className="px-5 py-3.5"><StatusPill status={customer.currency} /></td>
                  <td className="tnum px-5 py-3.5">{formatMoney(customer.balanceMinor, customer.currency)}</td>
                  <td className="px-5 py-3.5 text-inksoft">
                    {new Date(customer.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={page}
        total={total}
        limit={limit}
        basePath="/customers"
        extra={search ? `&search=${encodeURIComponent(search)}` : ""}
      />
    </>
  );
}

export default async function CustomersPage({
  searchParams,
}: PageProps<"/customers">) {
  const params = await searchParams;
  const page = toNumber(params.page);
  const limit = 20;
  const search = typeof params.search === "string" ? params.search.trim().slice(0, 120) : "";

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Customers"
        description="Everyone you bill, with balances and payment methods in one place."
        action={<NewCustomerForm />}
      />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-ink">Customer directory</h2>
            <p className="mt-0.5 text-xs text-inksoft">Search, filter and open customer records</p>
          </div>
          <form action="/customers" method="get" className="relative w-full max-w-xs" role="search">
            <label htmlFor="customer-search" className="sr-only">Search customers</label>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-inksoft" />
            <input
              id="customer-search"
              name="search"
              type="search"
              defaultValue={search}
              placeholder="Name, email or ID"
              className="w-full rounded-lg border border-line bg-paper py-2 pl-9 pr-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </form>
        </div>
        <Suspense fallback={<TableSkeleton />}>
          <CustomerTable page={page} search={search} limit={limit} />
        </Suspense>
      </Card>
    </>
  );
}
