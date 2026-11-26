import { Suspense } from "react";
import { connectDB } from "@/lib/db";
import { escapeRegex } from "@/lib/api";
import { Product } from "@/models/Product";
import { Price } from "@/models/Price";
import { productDTO } from "@/lib/serialize";
import { NewProductForm } from "@/components/ResourceForms";
import { TableSkeleton } from "@/components/Skeleton";
import { Card, EmptyState, PageHeader, StatusPill, TableHead } from "@/components/ui";
import Link from "next/link";

export const metadata = { title: "Products — Ledgerline" };

async function ProductTable({ search }: { search: string }) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (search) filter.name = new RegExp(escapeRegex(search), "i");
  const docs = await Product.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  const products = docs.map((doc) => productDTO(doc));

  const priceCounts = await Price.aggregate([
    { $group: { _id: "$product", count: { $sum: 1 } } },
  ]);
  const countByProduct = new Map(
    priceCounts.map((item) => [item._id.toString(), item.count as number]),
  );

  if (products.length === 0) {
    return (
      <EmptyState
        title="No products in the catalog"
        description="Create a product first, then attach a monthly, yearly or one-time price to it."
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-sm">
        <TableHead columns={["Product", "Description", "Prices", "Status", "Created"]} />
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-line last:border-0 hover:bg-paper/60">
              <td className="px-5 py-3.5">
                <p className="font-medium text-ink">{product.name}</p>
                <p className="tnum mt-0.5 text-[11px] text-inksoft">{product.pid}</p>
              </td>
              <td className="max-w-[320px] px-5 py-3.5 text-inksoft">
                {product.description || <span className="text-inksoft/60">No description</span>}
              </td>
              <td className="px-5 py-3.5">
                <Link href={`/prices?search=${encodeURIComponent(product.id)}`} className="tnum text-accent hover:underline">
                  {countByProduct.get(product.id) ?? 0} price(s)
                </Link>
              </td>
              <td className="px-5 py-3.5"><StatusPill status={product.active ? "active" : "canceled"} /></td>
              <td className="px-5 py-3.5 text-inksoft">
                {new Date(product.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search.trim().slice(0, 120) : "";

  return (
    <>
      <PageHeader
        eyebrow="Billing / Catalog"
        title="Products"
        description="The things you sell. Each product can carry multiple prices and billing intervals."
        action={<NewProductForm />}
      />
      <Card>
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold text-ink">Product catalog</h2>
          <p className="mt-0.5 text-xs text-inksoft">All products in this workspace</p>
        </div>
        <Suspense fallback={<TableSkeleton />}>
          <ProductTable search={search} />
        </Suspense>
      </Card>
    </>
  );
}
