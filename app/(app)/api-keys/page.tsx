import { Suspense } from "react";
import { connectDB } from "@/lib/db";
import { ApiKey } from "@/models/ApiKey";
import { apiKeyDTO } from "@/lib/serialize";
import { NewApiKeyForm, RowAction } from "@/components/ResourceForms";
import { TableSkeleton } from "@/components/Skeleton";
import { Card, CardHeader, EmptyState, PageHeader, StatusPill, TableHead } from "@/components/ui";

export const metadata = { title: "API keys — Ledgerline" };

async function KeyTable() {
  await connectDB();
  const docs = await ApiKey.find().sort({ createdAt: -1 }).limit(100).lean();
  const keys = docs.map((doc) => apiKeyDTO(doc));
  if (keys.length === 0) {
    return <EmptyState title="No API keys yet" description="Create a key to call the admin metrics endpoint." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <TableHead columns={["Name", "Masked value", "Scope", "Last used", "Status", "Action"]} />
        <tbody>
          {keys.map((key) => (
            <tr key={key.id} className="border-b border-line last:border-0">
              <td className="px-5 py-3.5 font-medium text-ink">{key.name}</td>
              <td className="tnum px-5 py-3.5 text-inksoft"><code>{key.masked}</code></td>
              <td className="px-5 py-3.5"><StatusPill status={key.scope} /></td>
              <td className="px-5 py-3.5 text-inksoft">
                {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}
              </td>
              <td className="px-5 py-3.5"><StatusPill status={key.revokedAt ? "canceled" : "active"} /></td>
              <td className="px-5 py-3.5">
                {!key.revokedAt && <RowAction url={`/api/api-keys/${key.id}`} method="DELETE" label="Revoke" />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ApiKeysPage() {
  return (
    <>
      <PageHeader
        eyebrow="Developers"
        title="API keys"
        description="Scoped credentials for programmatic access. Full tokens are shown once; only hashes are stored."
        action={<NewApiKeyForm />}
      />
      <Card>
        <CardHeader title="Workspace keys" hint="Use a bearer token: Authorization: Bearer ll_read_…" />
        <Suspense fallback={<TableSkeleton />}>
          <KeyTable />
        </Suspense>
      </Card>
      <div className="mt-5 rounded-xl border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink">Scope reference</h2>
        <dl className="mt-3 grid gap-4 text-xs sm:grid-cols-3">
          <div>
            <dt className="font-semibold text-ink">read</dt>
            <dd className="mt-1 leading-5 text-inksoft">Read-only reporting endpoints. Cannot access admin metrics.</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">write</dt>
            <dd className="mt-1 leading-5 text-inksoft">Create and update billing resources. Still restricted from admin routes.</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">admin</dt>
            <dd className="mt-1 leading-5 text-inksoft">Full access, including GET /api/admin/metrics.</dd>
          </div>
        </dl>
      </div>
    </>
  );
}
