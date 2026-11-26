import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Overview — Ledgerline" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Overview"
        description="Revenue, subscriptions and payment activity across your ledger."
      />
      <Card className="p-6">
        <p className="text-sm text-inksoft">Dashboard data appears once the reporting slice is built.</p>
      </Card>
    </>
  );
}
