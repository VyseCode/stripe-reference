import { Suspense } from "react";
import { connectDB } from "@/lib/db";
import { Price } from "@/models/Price";
import { Product } from "@/models/Product";
import { priceDTO } from "@/lib/serialize";
import { formatMoney } from "@/lib/money";
import { NewPriceForm, RowAction } from "@/components/ResourceForms";
import { TableSkeleton } from "@/components/Skeleton";
import { Card, EmptyState, PageHeader, StatusPill, TableHead } from "@/components/ui";

export const metadata = { title: "Prices — Ledgerline" };

async function PriceTable({ productFilter }: { productFilter: string }) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (productFilter) {
    const product = await Product.findOne(
      /^[a-fA-F0-9]{24}$/.test(productFilter)
        ? { _id: productFilter }
        : { pid: productFilter },
    ).lean();
    filter.product = product ? product._id : "000000000000000000000000";
  }
  const docs = await Price.find(filter)
    .populate("product", "name")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  const prices = docs.map((doc) => priceDTO(doc));

  if (prices.length === 0) {
    return (
      <EmptyState
        title="No prices to show"
        description="Add a price to a product, or clear the product filter to see the full price list."
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <TableHead columns={["Price", "Product", "Amount", "Interval", "Status", "Action"]} />
        <tbody>
          {prices.map((price) => (
            <tr key={price.id} className="border-b border-line last:border-0">
              <td className="px-5 py-3.5"><p className="tnum font-medium text-ink">{price.pid}</p></td>
              <td className="px-5 py-3.5 text-inksoft">{price.productName || "Archived product"}</td>
              <td className="tnum px-5 py-3.5 font-medium text-ink">
                {formatMoney(price.unitAmountMinor, price.currency)}
              </td>
              <td className="px-5 py-3.5"><StatusPill status={price.interval} /></td>
              <td className="px-5 py-3.5"><StatusPill status={price.active ? "active" : "canceled"} /></td>
              <td className="px-5 py-3.5">
                <RowAction
                  url={`/api/prices/${price.id}`}
                  method="PATCH"
                  label={price.active ? "Archive" : "Activate"}
                  body={{ active: !price.active }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function PricesPage({ searchParams }: PageProps<"/prices">) {
  const params = await searchParams;
  const productFilter = typeof params.search === "string" ? params.search.trim() : "";

  const products = await (async () => {
    await connectDB();
    return Product.find({ active: true }).sort({ name: 1 }).limit(100).lean();
  })();

  return (
    <>
      <PageHeader
        eyebrow="Billing / Catalog"
        title="Prices"
        description="One-time charges and recurring intervals. All amounts are stored as integer minor units."
        action={
          <NewPriceForm
            products={products.map((product) => ({
              id: product._id.toString(),
              name: product.name,
            }))}
          />
        }
      />
      <Card>
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">Price list</h2>
          <p className="mt-0.5 text-xs text-inksoft">
            {productFilter ? "Filtered by product" : "Monthly, yearly and one-time prices"}
          </p>
        </div>
        <Suspense fallback={<TableSkeleton />}>
          <PriceTable productFilter={productFilter} />
        </Suspense>
      </Card>
    </>
  );
}
