import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { lookupFilter } from "@/lib/ids";
import { CheckoutSession } from "@/models/CheckoutSession";
import { checkoutDTO } from "@/lib/serialize";
import { formatMoney } from "@/lib/money";
import { CompleteCheckout } from "@/components/ResourceForms";
import { ButtonLink, Card, CardHeader, KeyValue, StatusPill } from "@/components/ui";
import { CheckoutIcon } from "@/components/Icons";

export const metadata = { title: "Hosted checkout — Ledgerline" };

export default async function CheckoutDetailPage({
  params,
}: PageProps<"/checkout/[id]">) {
  const { id } = await params;
  await connectDB();
  const doc = await CheckoutSession.findOne(lookupFilter(id))
    .populate("customer", "name email")
    .populate("price", "unitAmountMinor currency interval")
    .lean();
  if (!doc) notFound();
  const session = checkoutDTO(doc);

  const populatedCustomer =
    doc.customer && typeof doc.customer === "object" && "email" in doc.customer
      ? {
          name: String((doc.customer as { name?: unknown }).name ?? ""),
          email: String((doc.customer as { email?: unknown }).email ?? ""),
        }
      : null;

  return (
    <>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accentwash text-accent">
              <CheckoutIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                Hosted checkout
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-ink">Complete this payment</h1>
            </div>
          </div>
          <ButtonLink href="/checkout" variant="secondary">Back to sessions</ButtonLink>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <Card>
            <CardHeader title="Payment simulation" hint="No external gateway is contacted" />
            <div className="p-5">
              {session.status === "open" ? (
                <>
                  <p className="text-sm leading-6 text-inksoft">
                    Choose how this local checkout should resolve. A successful completion
                    creates an invoice, a charge and two ledger entries; a failure creates
                    no financial records.
                  </p>
                  <div className="mt-5">
                    <CompleteCheckout sessionId={session.id} />
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-line bg-paper p-5 text-center">
                  <StatusPill status={session.status} />
                  <p className="mt-3 text-sm leading-6 text-inksoft">
                    {session.status === "complete"
                      ? "This session was completed. An invoice and ledger entries were recorded."
                      : session.status === "failed"
                        ? "This session failed. No money moved and no invoice was created."
                        : "This session expired before completion."}
                  </p>
                </div>
              )}
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-inksoft">
                Amount due
              </p>
              <p className="tnum mt-2 text-3xl font-semibold tracking-tight text-ink">
                {formatMoney(session.amountMinor, session.currency)}
              </p>
              <p className="mt-1 text-xs text-inksoft">{session.mode} checkout</p>
            </Card>
            <Card className="p-5">
              <h2 className="mb-2 text-sm font-semibold text-ink">Session details</h2>
              <dl>
                <KeyValue label="Session ID"><span className="tnum">{session.pid}</span></KeyValue>
                <KeyValue label="Customer">{populatedCustomer?.name || "—"}</KeyValue>
                <KeyValue label="Email">{populatedCustomer?.email || "—"}</KeyValue>
                <KeyValue label="Status"><StatusPill status={session.status} /></KeyValue>
                <KeyValue label="Configured outcome">
                  <StatusPill status={session.outcome} />
                </KeyValue>
                <KeyValue label="Expires">
                  <span className="tnum">{new Date(session.expiresAt).toLocaleString()}</span>
                </KeyValue>
              </dl>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
