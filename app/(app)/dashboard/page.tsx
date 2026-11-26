import Link from "next/link";
import { Suspense } from "react";
import { connectDB } from "@/lib/db";
import { Subscription } from "@/models/Subscription";
import { Invoice } from "@/models/Invoice";
import { LedgerEntry } from "@/models/LedgerEntry";
import { WebhookEvent } from "@/models/WebhookEvent";
import { currentBalanceMinor } from "@/lib/ledger";
import { formatMoney, monthlyAmountMinor } from "@/lib/money";
import { ledgerDTO, webhookDTO } from "@/lib/serialize";
import {
  BalanceIcon,
  CheckoutIcon,
  SubscriptionIcon,
  TrendIcon,
  WebhookIcon,
} from "@/components/Icons";
import { ChartSkeleton, MetricSkeleton, TableSkeleton } from "@/components/Skeleton";
import {
  Card,
  CardHeader,
  EmptyState,
  Metric,
  PageHeader,
  StatusPill,
  TableHead,
} from "@/components/ui";

export const metadata = { title: "Overview — Ledgerline" };

async function DashboardMetrics() {
  await connectDB();
  const [subscriptions, balance, paidCount] = await Promise.all([
    Subscription.find({ status: { $in: ["active", "trialing", "past_due"] } })
      .populate("price", "unitAmountMinor interval")
      .lean(),
    currentBalanceMinor(),
    Invoice.countDocuments({ status: "paid" }),
  ]);

  const mrr = subscriptions.reduce((sum, sub) => {
    const price = sub.price as unknown as {
      unitAmountMinor?: unknown;
      interval?: unknown;
    } | null;
    if (
      !price ||
      typeof price.unitAmountMinor !== "number" ||
      typeof price.interval !== "string"
    ) {
      return sum;
    }
    return sum + monthlyAmountMinor(price.unitAmountMinor, price.interval);
  }, 0);
  const billable = subscriptions.filter((sub) => sub.status !== "trialing").length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Monthly recurring" value={formatMoney(mrr)} hint="Normalized from active cycles" icon={<TrendIcon />} />
      <Metric label="Billable subscriptions" value={String(billable)} hint={`${subscriptions.length} including trials`} icon={<SubscriptionIcon />} />
      <Metric label="Paid invoices" value={String(paidCount)} hint="All-time settled invoices" icon={<CheckoutIcon />} />
      <Metric label="Available balance" value={formatMoney(balance)} hint="Ledger balance right now" icon={<BalanceIcon />} />
    </div>
  );
}

type Point = { label: string; totalMinor: number };

async function RevenueChart() {
  await connectDB();
  const now = new Date();
  const monthKeys: string[] = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    monthKeys.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
  }

  const rows = await Invoice.aggregate([
    { $match: { status: "paid", paidAt: { $ne: null } } },
    {
      $group: {
        _id: {
          year: { $year: "$paidAt" },
          month: { $month: "$paidAt" },
        },
        total: { $sum: "$amountMinor" },
      },
    },
  ]);
  const byMonth = new Map(
    rows.map((row) => [
      `${row._id.year}-${String(row._id.month).padStart(2, "0")}`,
      row.total as number,
    ]),
  );
  const points: Point[] = monthKeys.map((key) => ({
    label: new Date(`${key}-01T00:00:00Z`).toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
    totalMinor: byMonth.get(key) ?? 0,
  }));

  const max = Math.max(...points.map((point) => point.totalMinor), 1);
  const width = 600;
  const height = 210;
  const padX = 30;
  const padY = 20;
  const step = (width - padX * 2) / (points.length - 1);
  const coords = points.map((point, index) => ({
    x: padX + index * step,
    y: height - padY - (point.totalMinor / max) * (height - padY * 2),
  }));
  const polyline = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${padX},${height - padY} ${polyline} ${width - padX},${height - padY}`;

  return (
    <Card>
      <CardHeader
        title="Revenue collected"
        hint="Paid invoice value by month, in minor units"
        action={
          <span className="rounded-full bg-accentwash px-2.5 py-1 text-[11px] font-semibold text-accentdeep">
            Last 6 months
          </span>
        }
      />
      <div className="p-5">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-56 w-full"
          role="img"
          aria-label={`Revenue by month: ${points.map((point) => `${point.label} ${formatMoney(point.totalMinor)}`).join(", ")}`}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = height - padY - ratio * (height - padY * 2);
            return (
              <g key={ratio}>
                <line x1={padX} x2={width - padX} y1={y} y2={y} stroke="#e2e5e1" strokeWidth="1" />
                <text x={4} y={y + 4} fontSize="10" fill="#52616d">
                  {(max * ratio / 100).toFixed(0)}
                </text>
              </g>
            );
          })}
          <polygon points={area} fill="#0d7d74" opacity="0.09" />
          <polyline
            points={polyline}
            fill="none"
            stroke="#0d7d74"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {coords.map((point, index) => (
            <g key={points[index].label}>
              <circle cx={point.x} cy={point.y} r="3.5" fill="#ffffff" stroke="#0d7d74" strokeWidth="2" />
              <text x={point.x} y={height - 4} textAnchor="middle" fontSize="10" fill="#52616d">
                {points[index].label}
              </text>
            </g>
          ))}
        </svg>
        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-3 lg:grid-cols-6">
          {points.map((point) => (
            <div key={point.label}>
              <p className="text-[10px] uppercase tracking-wider text-inksoft">{point.label}</p>
              <p className="tnum mt-0.5 text-xs font-semibold text-ink">{formatMoney(point.totalMinor)}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

async function SubscriptionBreakdown() {
  await connectDB();
  const rows = await Subscription.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const counts = new Map(rows.map((row) => [row._id as string, row.count as number]));
  const statuses = ["active", "trialing", "past_due", "canceled"];
  const total = statuses.reduce((sum, status) => sum + (counts.get(status) ?? 0), 0);

  return (
    <Card>
      <CardHeader title="Subscription mix" hint={`${total} subscriptions across all states`} />
      <div className="space-y-4 p-5">
        {statuses.map((status) => {
          const count = counts.get(status) ?? 0;
          const percent = total === 0 ? 0 : Math.round((count / total) * 100);
          return (
            <div key={status}>
              <div className="mb-1.5 flex items-center justify-between">
                <StatusPill status={status} />
                <span className="tnum text-xs font-semibold text-ink">{count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-line/70">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
        <Link href="/subscriptions" className="inline-flex items-center gap-1 pt-1 text-xs font-semibold text-accent hover:underline">
          View all subscriptions →
        </Link>
      </div>
    </Card>
  );
}

async function RecentActivity() {
  await connectDB();
  const [entries, events] = await Promise.all([
    LedgerEntry.find().sort({ createdAt: -1 }).limit(6).lean(),
    WebhookEvent.find().sort({ receivedAt: -1 }).limit(5).lean(),
  ]);
  const transactions = entries.map((doc) => ledgerDTO(doc));
  const webhooks = events.map((doc) => webhookDTO(doc));

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader title="Recent ledger activity" hint="Latest balance movements" />
        {transactions.length === 0 ? (
          <EmptyState title="No activity yet" description="Payments and payouts will appear here." />
        ) : (
          <div className="divide-y divide-line">
            {transactions.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-ink">{entry.description}</p>
                  <p className="tnum mt-0.5 text-[11px] text-inksoft">
                    {new Date(entry.createdAt).toLocaleDateString()} · {entry.kind}
                  </p>
                </div>
                <span className={`tnum shrink-0 text-xs font-semibold ${entry.amountMinor < 0 ? "text-signal" : "text-positive"}`}>
                  {entry.amountMinor < 0 ? "−" : "+"}{formatMoney(Math.abs(entry.amountMinor), entry.currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Webhook log"
          hint="Signed events received by the local endpoint"
          action={<WebhookIcon className="h-4 w-4 text-accent" />}
        />
        {webhooks.length === 0 ? (
          <EmptyState title="No webhook events" description="Signed deliveries will be recorded here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-left text-sm">
              <TableHead columns={["Event", "Type", "Status", "Received"]} />
              <tbody>
                {webhooks.map((event) => (
                  <tr key={event.id} className="border-b border-line last:border-0">
                    <td className="tnum px-5 py-3 text-ink">{event.eventId}</td>
                    <td className="max-w-[180px] truncate px-5 py-3 text-inksoft">{event.type}</td>
                    <td className="px-5 py-3"><StatusPill status={event.status} /></td>
                    <td className="px-5 py-3 text-inksoft">
                      {new Date(event.receivedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Overview"
        description="Revenue, subscriptions and payment activity across your ledger — all simulated locally."
      />
      <div className="space-y-5">
        <Suspense fallback={<MetricSkeleton />}>
          <DashboardMetrics />
        </Suspense>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Suspense fallback={<ChartSkeleton />}>
            <RevenueChart />
          </Suspense>
          <Suspense fallback={<TableSkeleton rows={4} />}>
            <SubscriptionBreakdown />
          </Suspense>
        </div>
        <Suspense fallback={<TableSkeleton rows={4} />}>
          <RecentActivity />
        </Suspense>
      </div>
    </>
  );
}
