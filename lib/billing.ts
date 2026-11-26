import type { Types } from "mongoose";
import { Invoice } from "@/models/Invoice";
import { Customer } from "@/models/Customer";
import { Price } from "@/models/Price";
import { Subscription } from "@/models/Subscription";
import { makePid, nextInvoiceNumber } from "@/lib/ids";
import { allocateMinor } from "@/lib/money";
import type { InvoiceStatus } from "@/models/Invoice";

export type InvoiceLineInput = {
  description: string;
  quantity: number;
  unitAmountMinor: number;
};

export function buildInvoiceAmounts(lines: InvoiceLineInput[], taxRateBps = 0) {
  const subtotals = lines.map((line) => line.unitAmountMinor * line.quantity);
  const subtotalMinor = subtotals.reduce((sum, value) => sum + value, 0);
  const taxMinor = Math.round((subtotalMinor * taxRateBps) / 10_000);
  const taxShares = allocateMinor(taxMinor, subtotals);
  const builtLines = lines.map((line, index) => ({
    description: line.description,
    quantity: line.quantity,
    unitAmountMinor: line.unitAmountMinor,
    amountMinor: subtotals[index] + taxShares[index],
  }));
  return {
    lines: builtLines,
    subtotalMinor,
    taxMinor: taxShares.reduce((sum, value) => sum + value, 0),
    amountMinor: subtotalMinor + taxMinor,
  };
}

export async function createInvoice({
  customerId,
  subscriptionId = null,
  lines,
  currency = "usd",
  status = "open",
  taxRateBps = 0,
  periodStart = null,
  periodEnd = null,
  dueDate = null,
  paid = false,
}: {
  customerId: Types.ObjectId | string;
  subscriptionId?: Types.ObjectId | string | null;
  lines: InvoiceLineInput[];
  currency?: string;
  status?: InvoiceStatus;
  taxRateBps?: number;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  dueDate?: Date | null;
  paid?: boolean;
}) {
  const amounts = buildInvoiceAmounts(lines, taxRateBps);
  return Invoice.create({
    pid: makePid("in"),
    number: await nextInvoiceNumber(),
    customer: customerId,
    subscription: subscriptionId,
    status,
    currency,
    lines: amounts.lines,
    subtotalMinor: amounts.subtotalMinor,
    taxMinor: amounts.taxMinor,
    amountMinor: amounts.amountMinor,
    periodStart,
    periodEnd,
    dueDate,
    paidAt: paid ? new Date() : null,
  });
}

export async function cycleInvoiceForSubscription(subscriptionId: Types.ObjectId) {
  const subscription = await Subscription.findById(subscriptionId).lean();
  if (!subscription) return null;

  const price = await Price.findById(subscription.price).lean();
  const customer = await Customer.findById(subscription.customer).select("currency").lean();
  if (!price || !customer) return null;

  return createInvoice({
    customerId: subscription.customer,
    subscriptionId: subscription._id,
    lines: [
      {
        description: `${price.pid} — billing cycle`,
        quantity: 1,
        unitAmountMinor: price.unitAmountMinor,
      },
    ],
    currency: customer.currency,
    status: "open",
    periodStart: subscription.currentPeriodStart,
    periodEnd: subscription.currentPeriodEnd,
    dueDate: new Date(Date.now() + 7 * 86_400_000),
  });
}
