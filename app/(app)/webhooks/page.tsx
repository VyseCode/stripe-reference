import { Suspense } from "react";
import { connectDB } from "@/lib/db";
import { WebhookEvent } from "@/models/WebhookEvent";
import { webhookDTO } from "@/lib/serialize";
import { TableSkeleton } from "@/components/Skeleton";
import { Card, EmptyState, PageHeader, StatusPill, TableHead } from "@/components/ui";

export const metadata = { title: "Webhooks — Ledgerline" };

async function EventLog() {
  await connectDB();
  const docs = await WebhookEvent.find().sort({ receivedAt: -1 }).limit(100).lean();
  const events = docs.map((doc) => webhookDTO(doc));
  if (events.length === 0) {
    return (
      <EmptyState
        title="No webhook events received"
        description="Signed events sent to POST /api/webhooks/stripe will be recorded here."
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] text-left text-sm">
        <TableHead columns={["Event ID", "Type", "Status", "Deliveries", "Received", "Payload"]} />
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-b border-line last:border-0">
              <td className="tnum px-5 py-3.5 font-medium text-ink">{event.eventId}</td>
              <td className="px-5 py-3.5 text-inksoft">{event.type}</td>
              <td className="px-5 py-3.5"><StatusPill status={event.status} /></td>
              <td className="tnum px-5 py-3.5 text-inksoft">{event.deliveries}</td>
              <td className="px-5 py-3.5 text-inksoft">
                {new Date(event.receivedAt).toLocaleString()}
              </td>
              <td className="max-w-[260px] truncate px-5 py-3.5 text-inksoft">
                <code>{JSON.stringify(event.payload)}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function WebhooksPage() {
  return (
    <>
      <PageHeader
        eyebrow="Developers"
        title="Webhook log"
        description="HMAC-verified events, stored once and processed idempotently. Duplicate deliveries increment a counter without repeating effects."
      />
      <Card>
        <Suspense fallback={<TableSkeleton />}>
          <EventLog />
        </Suspense>
      </Card>
      <div className="mt-5 rounded-xl border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold text-ink">Signature format</h2>
        <p className="mt-2 text-sm leading-6 text-inksoft">
          Send a <code className="tnum rounded bg-paper px-1.5 py-0.5 text-xs">POST</code> to{" "}
          <code className="tnum rounded bg-paper px-1.5 py-0.5 text-xs">/api/webhooks/stripe</code> with header{" "}
          <code className="tnum rounded bg-paper px-1.5 py-0.5 text-xs">x-ledgerline-signature: t=&lt;unix&gt;,v1=&lt;hmac&gt;</code>,
          where the HMAC is SHA-256 of <code className="tnum">timestamp.rawBody</code> using the webhook secret.
        </p>
      </div>
    </>
  );
}
